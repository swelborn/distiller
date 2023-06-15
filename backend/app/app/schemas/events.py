from pydantic import BaseModel

from datetime import timedelta
from app.schemas.job import Job, JobState
from app.schemas.scan import Scan
from typing import Optional
from enum import Enum

# Has to go in separate module rather the job.py because of circular import.

class JobEventType(str, Enum):
    SUBMIT = "job.submit"
    UPDATED = "job.updated"
    CANCEL = "job.cancel"

    def __str__(self) -> str:
        return self.value

    def __repr__(self) -> str:
        return self.value


class SubmitJobEvent(BaseModel):
    job: Job
    scan: Optional[Scan]
    event_type = JobEventType.SUBMIT

class CancelJobEvent(BaseModel):
    job: Job
    event_type = JobEventType.CANCEL

class UpdateJobEvent(BaseModel):
    id: int
    event_type: JobEventType
    slurm_id: Optional[int]
    state: Optional[JobState]
    output: Optional[str]
    elapsed: Optional[timedelta]
    event_type = JobEventType.UPDATED

    @classmethod
    def from_job(cls, job: Job):
        return cls(id=job.id, 
                   slurm_id=job.slurm_id, 
                   state=job.state, 
                   elapsed=job.elapsed)


class RemoveScanFilesEvent(BaseModel):
    scan: Scan
    host: str
