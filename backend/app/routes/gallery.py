from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.models.schemas import (
    ShareRequest,
    ShareResponse,
)
from app.services.job_store import job_store

router = APIRouter(prefix="/api")


@router.post("/poster/{job_id}/share", response_model=ShareResponse)
async def share_poster(job_id: str, req: ShareRequest) -> ShareResponse:
    """Create a shareable link for a completed poster."""
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Poster not ready for sharing")

    share_id = job_store.share(job_id)
    if not share_id:
        raise HTTPException(status_code=400, detail="Could not create share link")

    return ShareResponse(
        share_id=share_id,
        share_url=f"/api/share/{share_id}",
    )


@router.get("/share/{share_id}")
async def get_shared_poster(share_id: str) -> FileResponse:
    """Get shared poster image by share_id."""
    job = job_store.get_by_share_id(share_id)
    if not job or not job.result_path:
        raise HTTPException(status_code=404, detail="Shared poster not found")

    file_path = Path(job.result_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Poster file not found")

    return FileResponse(
        path=str(file_path),
        media_type="image/png",
        filename=f"{job.city.lower().replace(' ', '_')}_{job.theme}_poster.png",
    )
