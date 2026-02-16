import uuid
from typing import Dict, Optional


class Job:
    def __init__(self, city: str, country: str, theme: str, distance: int, email: Optional[str]) -> None:
        self.job_id: str = uuid.uuid4().hex
        self.city: str = city
        self.country: str = country
        self.theme: str = theme
        self.distance: int = distance
        self.email: Optional[str] = email
        self.status: str = "queued"
        self.stage: Optional[str] = None
        self.result_path: Optional[str] = None
        self.error: Optional[str] = None


class JobStore:
    """In-memory job store."""

    def __init__(self) -> None:
        self._jobs: Dict[str, Job] = {}

    def create(self, city: str, country: str, theme: str, distance: int, email: Optional[str]) -> Job:
        job = Job(city=city, country=country, theme=theme, distance=distance, email=email)
        self._jobs[job.job_id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)


job_store = JobStore()
