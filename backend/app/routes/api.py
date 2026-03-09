import asyncio
import logging
import multiprocessing
import os
import queue as _queue_mod
import re
import threading
import time
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from app.engine.generator import generate_poster, OUTPUT_DIR
from app.models.schemas import (
    ErrorResponse,
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    StatusResponse,
    ThemeItem,
    ThemesResponse,
)
from app.models.themes import THEMES
from app.services.email import send_poster_email
from app.services.job_store import job_store
from app.services.rate_limiter import rate_limiter, ip_rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

MAX_CONCURRENT_JOBS = int(os.environ.get("MAX_CONCURRENT_JOBS", "3"))
GENERATION_TIMEOUT = int(os.environ.get("GENERATION_TIMEOUT", "600"))
_generation_semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)

ALLOWED_OUTPUT_FORMATS = ["instagram", "mobile_wallpaper", "hd_wallpaper", "4k_wallpaper", "a4_print"]

def _safe_filename(city: str, theme: str) -> str:
    """Sanitize user input for use in Content-Disposition filename."""
    safe_city = re.sub(r"[^a-zA-Z0-9_-]", "_", city.lower().strip())[:80]
    return f"{safe_city}_{theme}_poster.png"


def _generation_worker(
    city: str, country: str, theme: str, distance: int,
    output_format: str, custom_title: str, landmarks: list,
    comm_queue: multiprocessing.Queue,
) -> None:
    """Run in a child process — generate poster, relay stage updates and result via queue.

    When this process exits, the OS reclaims ALL its memory (graphs, GeoDataFrames,
    matplotlib figures, etc.). This prevents the parent from accumulating RAM across
    successive generation jobs.
    """
    def _on_stage(stage: str) -> None:
        comm_queue.put(("stage", stage))

    try:
        path = generate_poster(
            city=city, country=country, theme=theme, distance=distance,
            output_format=output_format, custom_title=custom_title,
            landmarks=landmarks, on_stage=_on_stage,
        )
        comm_queue.put(("result", path))
    except Exception as e:
        comm_queue.put(("error", str(e)))


def _process_job(job_id: str) -> None:
    """Spawn a child process for poster generation so memory is fully reclaimed on exit."""
    job = job_store.get(job_id)
    if not job:
        return

    job.status = "processing"

    comm_queue: multiprocessing.Queue = multiprocessing.Queue()
    proc = multiprocessing.Process(
        target=_generation_worker,
        args=(job.city, job.country, job.theme, job.distance,
              job.output_format, job.custom_title, job.landmarks, comm_queue),
        daemon=True,
    )
    proc.start()

    # Monitor subprocess: relay stage updates, collect result
    result_path = None
    error = None
    deadline = time.monotonic() + GENERATION_TIMEOUT

    while time.monotonic() < deadline:
        try:
            msg_type, msg_value = comm_queue.get(timeout=2)
        except _queue_mod.Empty:
            if not proc.is_alive():
                break
            continue

        if msg_type == "stage":
            job.stage = msg_value
        elif msg_type == "result":
            result_path = msg_value
            break
        elif msg_type == "error":
            error = msg_value
            break

    # Ensure child is dead and resources freed
    if proc.is_alive():
        proc.kill()
    proc.join(timeout=10)

    # Drain any messages that arrived after the loop exited (race window
    # between get() timeout and is_alive() check)
    while True:
        try:
            msg_type, msg_value = comm_queue.get_nowait()
            if msg_type == "result":
                result_path = msg_value
            elif msg_type == "error":
                error = msg_value
        except _queue_mod.Empty:
            break

    if error:
        job.status = "failed"
        job.error = error
        logger.error("Job %s failed: %s", job_id, error)
        return

    if not result_path:
        job.status = "failed"
        job.error = f"Generation timed out after {GENERATION_TIMEOUT} seconds"
        logger.error("Job %s timed out after %ds", job_id, GENERATION_TIMEOUT)
        return

    job.result_path = result_path

    # Email is lightweight — run in parent process
    if job.email:
        job.stage = "sending_email"
        try:
            send_poster_email(
                job.email, job.city, result_path,
                theme=job.theme, distance=job.distance,
                custom_title=job.custom_title, output_format=job.output_format,
                landmarks=job.landmarks,
            )
        except Exception as e:
            logger.error("Email send failed for job %s: %s", job_id, e)

    job.stage = "done"
    job.status = "completed"
    logger.info("Job %s completed: %s", job_id, result_path)


def _run_with_semaphore(job_id: str, semaphore: asyncio.Semaphore, loop: asyncio.AbstractEventLoop) -> None:
    """Acquire semaphore, run job, release."""
    future = asyncio.run_coroutine_threadsafe(semaphore.acquire(), loop)
    future.result()  # block until slot available
    try:
        _process_job(job_id)
    finally:
        loop.call_soon_threadsafe(semaphore.release)


@router.post(
    "/generate",
    response_model=GenerateResponse,
    responses={422: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
async def generate(req: GenerateRequest, request: Request) -> GenerateResponse:
    # Rate limit by IP
    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )
    if not ip_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=429,
            detail={"error": "rate_limited", "detail": "Too many requests. Please try again later."},
        )

    # Validate theme
    if req.theme not in THEMES:
        raise HTTPException(
            status_code=422,
            detail={"error": "invalid_theme", "detail": f"Unknown theme: {req.theme}"},
        )

    # Validate output format
    if req.output_format not in ALLOWED_OUTPUT_FORMATS:
        raise HTTPException(
            status_code=422,
            detail={"error": "invalid_output_format", "detail": f"Unknown output format: {req.output_format}. Allowed: {ALLOWED_OUTPUT_FORMATS}"},
        )

    # Rate limit by email
    if req.email and not rate_limiter.is_allowed(req.email):
        raise HTTPException(
            status_code=429,
            detail={"error": "rate_limited", "detail": "Maximum 3 requests per email per 24 hours"},
        )

    # Validate landmarks count
    if len(req.landmarks) > 5:
        raise HTTPException(
            status_code=422,
            detail={"error": "too_many_landmarks", "detail": "Maximum 5 landmarks allowed"},
        )

    landmarks_dicts = [lm.model_dump() for lm in req.landmarks]

    try:
        job = job_store.create(
            city=req.city,
            country=req.country,
            theme=req.theme,
            distance=req.distance,
            email=req.email,
            output_format=req.output_format,
            custom_title=req.custom_title,
            landmarks=landmarks_dicts,
        )
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail={"error": "at_capacity", "detail": "Server is at capacity. Please try again later."},
        )

    loop = asyncio.get_event_loop()
    thread = threading.Thread(
        target=_run_with_semaphore,
        args=(job.job_id, _generation_semaphore, loop),
        daemon=True,
    )
    thread.start()

    estimated = max(10, req.distance // 200)

    return GenerateResponse(
        job_id=job.job_id,
        status=job.status,
        estimated_seconds=estimated,
    )


@router.get(
    "/status/{job_id}",
    response_model=StatusResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_status(job_id: str) -> StatusResponse:
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "detail": f"Job {job_id} not found"},
        )
    poster_url = f"/api/poster/{job.job_id}" if job.status == "completed" and job.result_path else None
    return StatusResponse(
        job_id=job.job_id,
        status=job.status,
        city=job.city,
        theme=job.theme,
        poster_url=poster_url,
        stage=job.stage,
        error_message=job.error,
        share_id=job.share_id,
    )


@router.get("/poster/{job_id}")
async def get_poster(job_id: str) -> FileResponse:
    """Serve the generated poster PNG for a completed job."""
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed" or not job.result_path:
        raise HTTPException(status_code=404, detail="Poster not ready")
    file_path = Path(job.result_path)
    if not file_path.resolve().is_relative_to(OUTPUT_DIR):
        raise HTTPException(status_code=403, detail="Access denied")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Poster file not found")
    return FileResponse(
        path=str(file_path),
        media_type="image/png",
        filename=_safe_filename(job.city, job.theme),
    )


@router.get("/themes", response_model=ThemesResponse)
async def get_themes() -> ThemesResponse:
    items: List[ThemeItem] = [
        ThemeItem(
            id=theme_id,
            name=data["name"],
            description=data["description"],
            preview_colors=data["preview_colors"],
        )
        for theme_id, data in THEMES.items()
    ]
    return ThemesResponse(themes=items)


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version="1.0.0")
