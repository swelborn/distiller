from enum import Enum
from typing import Dict, List, Optional, Union

import faust
from .scan import Scan


class JobType(str, Enum):
    COUNT = "count"
    TRANSFER = "transfer"

    def __str__(self) -> str:
        return self.value


class Job(faust.Record):
    id: int
    job_type: JobType
    machine: str
    params: Dict[str, Union[str, int, float]]
    scans: Optional[List[Scan]]


class SubmitJobEvent(faust.Record):
    job: Job
    scan: Optional[Scan]
