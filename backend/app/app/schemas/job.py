from datetime import timedelta, datetime
from enum import Enum
from typing import TYPE_CHECKING, Dict, ForwardRef, List, Optional, Union

Scan = ForwardRef("Scan")

if TYPE_CHECKING:
    from .scan import Scan

from pydantic import BaseModel


class JobType(str, Enum):
    TRANSFER = "transfer"
    COUNT = "count"
    STREAMING = "streaming"

    def __str__(self) -> str:
        return self.value


class JobState(str, Enum):
    INITIALIZING = (
        "INITIALIZING"  # This is not a slurm state. This is the default start state
    )
    BOOT_FAIL = "BOOT_FAIL"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    CONFIGURING = "CONFIGURING"
    COMPLETING = "COMPLETING"
    DEADLINE = "DEADLINE"
    FAILED = "FAILED"
    NODE_FAIL = "NODE_FAIL"
    OUT_OF_MEMORY = "OUT_OF_MEMORY"
    PENDING = "PENDING"
    PREEMPTED = "PREEMPTED"
    RUNNING = "RUNNING"
    RESV_DEL_HOLD = "RESV_DEL_HOLD"
    REQUEUE_FED = "REQUEUE_FED"
    REQUEUE_HOLD = "REQUEUE_HOLD"
    REQUEUED = "REQUEUED"
    RESIZING = "RESIZING"
    REVOKED = "REVOKED"
    SIGNALING = "SIGNALING"
    SPECIAL_EXIT = "SPECIAL_EXIT"
    STAGE_OUT = "STAGE_OUT"
    STOPPED = "STOPPED"
    SUSPENDED = "SUSPENDED"
    TIMEOUT = "TIMEOUT"

    def __str__(self) -> str:
        return self.name


class Job(BaseModel):
    id: int
    job_type: JobType
    scans: Optional[List[Scan]]
    machine: str
    slurm_id: Optional[int]
    state: JobState = JobState.INITIALIZING
    params: Dict[str, Union[str, int, float]]
    output: Optional[str]
    elapsed: Optional[timedelta]
    submit: Optional[datetime]

    class Config:
        orm_mode = True


class JobCreate(BaseModel):
    job_type: JobType
    scan_id: Optional[int]
    params: Dict[str, Union[str, int, float]]
    machine: str


class JobUpdate(BaseModel):
    slurm_id: Optional[int]
    state: Optional[JobState]
    output: Optional[str]
    elapsed: Optional[timedelta]
    scan_id: Optional[int]
    submit: Optional[datetime]


from .scan import Scan

Job.update_forward_refs()
