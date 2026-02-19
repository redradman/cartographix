import logging
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

MAX_JOBS = 500


class Job:
    def __init__(
        self,
        city: str,
        country: str,
        theme: str,
        distance: int,
        email: Optional[str],
        output_format: str = "instagram",
        custom_title: str = "",
        landmarks: Optional[List[dict]] = None,
    ) -> None:
        self.job_id: str = uuid.uuid4().hex
        self.city: str = city
        self.country: str = country
        self.theme: str = theme
        self.distance: int = distance
        self.email: Optional[str] = email
        self.output_format: str = output_format
        self.custom_title: str = custom_title
        self.landmarks: List[dict] = landmarks or []
        self.status: str = "queued"
        self.stage: Optional[str] = None
        self.result_path: Optional[str] = None
        self.error: Optional[str] = None
        self.share_id: Optional[str] = None
        self.created_at: str = datetime.utcnow().isoformat()


class JobStore:
    """In-memory job store."""

    def __init__(self) -> None:
        self._jobs: Dict[str, Job] = {}
        self._share_index: Dict[str, str] = {}  # share_id -> job_id

    def cleanup(self) -> None:
        """Remove old jobs and their output files to free memory and disk."""
        now = datetime.utcnow()
        to_remove: list[str] = []
        for job_id, job in self._jobs.items():
            try:
                created = datetime.fromisoformat(job.created_at)
            except (ValueError, TypeError):
                continue
            age = now - created
            # Remove completed/failed jobs after 2 hours
            if job.status in ("completed", "failed") and age > timedelta(hours=2):
                to_remove.append(job_id)
            # Remove any job after 6 hours regardless of status
            elif age > timedelta(hours=6):
                to_remove.append(job_id)

        for job_id in to_remove:
            job = self._jobs.pop(job_id, None)
            if job:
                # Clean up share index
                if job.share_id and job.share_id in self._share_index:
                    del self._share_index[job.share_id]
                # Delete output file from disk
                if job.result_path:
                    try:
                        Path(job.result_path).unlink(missing_ok=True)
                    except OSError:
                        pass
                logger.debug("Cleaned up job %s (age: %s)", job_id, now - datetime.fromisoformat(job.created_at) if job.created_at else "unknown")

        if to_remove:
            logger.info("Cleaned up %d old jobs", len(to_remove))

    def create(
        self,
        city: str,
        country: str,
        theme: str,
        distance: int,
        email: Optional[str],
        output_format: str = "instagram",
        custom_title: str = "",
        landmarks: Optional[List[dict]] = None,
    ) -> Job:
        self.cleanup()
        if len(self._jobs) >= MAX_JOBS:
            raise RuntimeError("Server is at capacity — please try again later")
        job = Job(
            city=city,
            country=country,
            theme=theme,
            distance=distance,
            email=email,
            output_format=output_format,
            custom_title=custom_title,
            landmarks=landmarks,
        )
        self._jobs[job.job_id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def share(self, job_id: str) -> Optional[str]:
        """Generate a share_id for a completed job. Returns share_id."""
        job = self._jobs.get(job_id)
        if not job or job.status != "completed":
            return None
        if job.share_id:
            return job.share_id
        share_id = uuid.uuid4().hex[:12]
        job.share_id = share_id
        self._share_index[share_id] = job_id
        return share_id

    def get_by_share_id(self, share_id: str) -> Optional[Job]:
        """Look up job by share_id."""
        job_id = self._share_index.get(share_id)
        if not job_id:
            return None
        return self._jobs.get(job_id)


job_store = JobStore()
