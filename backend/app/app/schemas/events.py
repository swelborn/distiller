from typing import Optional

from pydantic import BaseModel

from app.schemas.job import Job
from app.schemas.scan import Scan
from enum import Enum


# Has to go in separate module rather the job.py because of circular import.
class JobEventType(str, Enum):
    SUBMIT = "job.submit"

    def __str__(self) -> str:
        return self.value

    def __repr__(self) -> str:
        return self.value

class SubmitJobEvent(BaseModel):
    job: Job
    scan: Optional[Scan]
    event_type = JobEventType.SUBMIT

class RemoveScanFilesEvent(BaseModel):
    scan: Scan
    host: str
