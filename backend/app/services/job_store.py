import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple


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
    ) -> None:
        self.job_id: str = uuid.uuid4().hex
        self.city: str = city
        self.country: str = country
        self.theme: str = theme
        self.distance: int = distance
        self.email: Optional[str] = email
        self.output_format: str = output_format
        self.custom_title: str = custom_title
        self.status: str = "queued"
        self.stage: Optional[str] = None
        self.result_path: Optional[str] = None
        self.error: Optional[str] = None
        self.share_id: Optional[str] = None
        self.gallery_opt_in: bool = False
        self.created_at: str = datetime.utcnow().isoformat()


class JobStore:
    """In-memory job store."""

    def __init__(self) -> None:
        self._jobs: Dict[str, Job] = {}
        self._share_index: Dict[str, str] = {}  # share_id -> job_id

    def create(
        self,
        city: str,
        country: str,
        theme: str,
        distance: int,
        email: Optional[str],
        output_format: str = "instagram",
        custom_title: str = "",
    ) -> Job:
        job = Job(
            city=city,
            country=country,
            theme=theme,
            distance=distance,
            email=email,
            output_format=output_format,
            custom_title=custom_title,
        )
        self._jobs[job.job_id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def share(self, job_id: str, gallery_opt_in: bool) -> Optional[str]:
        """Generate a share_id for a completed job. Returns share_id."""
        job = self._jobs.get(job_id)
        if not job or job.status != "completed":
            return None
        if job.share_id:
            job.gallery_opt_in = job.gallery_opt_in or gallery_opt_in
            return job.share_id
        share_id = uuid.uuid4().hex[:12]
        job.share_id = share_id
        job.gallery_opt_in = gallery_opt_in
        self._share_index[share_id] = job_id
        return share_id

    def get_by_share_id(self, share_id: str) -> Optional[Job]:
        """Look up job by share_id."""
        job_id = self._share_index.get(share_id)
        if not job_id:
            return None
        return self._jobs.get(job_id)

    def list_gallery(self, limit: int = 20, offset: int = 0) -> Tuple[List[Job], int]:
        """Return gallery-opted-in completed jobs, newest first."""
        gallery_jobs = [
            job for job in self._jobs.values()
            if job.gallery_opt_in and job.status == "completed" and job.share_id
        ]
        gallery_jobs.sort(key=lambda j: j.created_at, reverse=True)
        total = len(gallery_jobs)
        return gallery_jobs[offset:offset + limit], total


job_store = JobStore()
