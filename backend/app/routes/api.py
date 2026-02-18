import asyncio
import logging
import os
import threading
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
GENERATION_TIMEOUT = int(os.environ.get("GENERATION_TIMEOUT", "300"))
_generation_semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)

ALLOWED_OUTPUT_FORMATS = ["instagram", "mobile_wallpaper", "hd_wallpaper", "4k_wallpaper", "a4_print"]


def _process_job(job_id: str) -> None:
    """Background task to generate a poster and optionally send email."""
    job = job_store.get(job_id)
    if not job:
        return

    def _update_stage(stage: str) -> None:
        job.stage = stage

    job.status = "processing"
    try:
        result_path = generate_poster(
            city=job.city,
            country=job.country,
            theme=job.theme,
            distance=job.distance,
            output_format=job.output_format,
            custom_title=job.custom_title,
            landmarks=job.landmarks,
            on_stage=_update_stage,
        )
        job.result_path = result_path

        if job.email:
            _update_stage("sending_email")
            send_poster_email(
                job.email,
                job.city,
                result_path,
                theme=job.theme,
                distance=job.distance,
                custom_title=job.custom_title,
                output_format=job.output_format,
                landmarks=job.landmarks,
            )

        _update_stage("done")
        job.status = "completed"
        logger.info("Job %s completed: %s", job_id, result_path)

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        logger.error("Job %s failed: %s", job_id, e)


def _run_with_semaphore(job_id: str, semaphore: asyncio.Semaphore, loop: asyncio.AbstractEventLoop) -> None:
    """Acquire semaphore, run job with timeout, release."""
    future = asyncio.run_coroutine_threadsafe(semaphore.acquire(), loop)
    future.result()  # block until slot available
    try:
        worker = threading.Thread(target=_process_job, args=(job_id,), daemon=True)
        worker.start()
        worker.join(timeout=GENERATION_TIMEOUT)
        if worker.is_alive():
            job = job_store.get(job_id)
            if job and job.status == "processing":
                job.status = "failed"
                job.error = f"Generation timed out after {GENERATION_TIMEOUT} seconds"
                logger.error("Job %s timed out after %ds", job_id, GENERATION_TIMEOUT)
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
        filename=f"{job.city.lower().replace(' ', '_')}_{job.theme}_poster.png",
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
