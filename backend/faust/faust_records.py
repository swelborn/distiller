import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from app.schema

import faust
from faust.serializers import codecs
from json_utils import NumpyEncoder


class Location(faust.Record):
    host: str
    path: str


class Scan(faust.Record):
    id: int
    locations: List[Location]
    created: datetime
    scan_id: Optional[int]
    jobs: Optional[List["Job"]]


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
    scans: Optional[List["Scan"]]


class SubmitJobEvent(faust.Record):
    job: Job
    scan: Optional["Scan"]


class json_numpy(codecs.Codec):
    def _dumps(self, obj: Any) -> bytes:
        return json.dumps(obj, cls=NumpyEncoder).encode()

    def _loads(self, s: bytes) -> Dict:
        return json.loads(s)


codecs.register("json_numpy", json_numpy())


class ScanMetadata(faust.Record, serializer="json_numpy"):
    scan_id: int
    metadata: Dict[str, Any]


class ScanUpdatedEvent(faust.Record):
    id: int
    notebooks: Optional[List[str]]
    event_type: str = "scan.updated"

Job.update_forward_refs()
Scan.update_forward_refs()
SubmitJobEvent.update_forward_refs()