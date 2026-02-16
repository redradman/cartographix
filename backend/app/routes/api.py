import logging
from pathlib import Path
from typing import List

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse

from app.engine.generator import generate_poster
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
from app.services.rate_limiter import rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


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
            on_stage=_update_stage,
        )
        job.result_path = result_path

        if job.email:
            _update_stage("sending_email")
            send_poster_email(job.email, job.city, result_path)

        _update_stage("done")
        job.status = "completed"
        logger.info("Job %s completed: %s", job_id, result_path)

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        logger.error("Job %s failed: %s", job_id, e)


@router.post(
    "/generate",
    response_model=GenerateResponse,
    responses={422: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
async def generate(req: GenerateRequest, background_tasks: BackgroundTasks) -> GenerateResponse:
    # Validate theme
    if req.theme not in THEMES:
        raise HTTPException(
            status_code=422,
            detail={"error": "invalid_theme", "detail": f"Unknown theme: {req.theme}"},
        )

    # Rate limit by email
    if req.email and not rate_limiter.is_allowed(req.email):
        raise HTTPException(
            status_code=429,
            detail={"error": "rate_limited", "detail": "Maximum 3 requests per email per 24 hours"},
        )

    job = job_store.create(
        city=req.city,
        country=req.country,
        theme=req.theme,
        distance=req.distance,
        email=req.email,
    )

    background_tasks.add_task(_process_job, job.job_id)

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
