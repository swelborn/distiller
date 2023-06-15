from typing import List, cast, Union

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app import schemas
from app.api.deps import get_db, oauth2_password_bearer_or_api_key
from app.crud import job as crud
from app.crud import scan as scan_crud
from app.kafka.producer import (send_scan_event_to_kafka,
                                send_job_event_to_kafka)
from app.schemas import SubmitJobEvent, CancelJobEvent, UpdateJobEvent
from app.schemas.scan import ScanUpdateEvent

router = APIRouter()


@router.post(
    "",
    response_model=schemas.Job,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
async def create_job(job: schemas.JobCreate, db: Session = Depends(get_db)):
    if job.scan_id is not None:
        scan = scan_crud.get_scan(db, job.scan_id)
        if scan is None:
            raise HTTPException(status_code=404, detail="Scan not found")
        scan = schemas.Scan.from_orm(scan)
    else:
        scan = None

    job = crud.create_job(db=db, job=job)
    job = schemas.Job.from_orm(job)

    await send_job_event_to_kafka(SubmitJobEvent(scan=scan, job=job))

    if job.scan_id is not None:
        jobs = crud.get_jobs(db, scan_id=job.scan_id)
        await send_scan_event_to_kafka(ScanUpdateEvent(id=job.scan_id, jobs=jobs))

    return job


@router.get(
    "",
    response_model=List[schemas.Job],
    response_model_by_alias=False,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
def read_jobs(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    scan_id: int = -1,
    job_type: Union[schemas.JobType, None] = None,
    db: Session = Depends(get_db),
):
    jobs = crud.get_jobs(db, skip=skip, limit=limit, scan_id=scan_id, job_type=job_type)
    count = crud.get_jobs_count(db, skip=skip, limit=limit, scan_id=scan_id, job_type=job_type)
    response.headers["X-Total-Count"] = str(count)
    return jobs


@router.get(
    "/{id}",
    response_model=schemas.Job,
    response_model_by_alias=False,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
def read_job(response: Response, id: int, db: Session = Depends(get_db)):
    db_job = crud.get_job(db, id=id)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    (prev_job, next_job) = crud.get_prev_next_job(db, id)

    if prev_job is not None:
        response.headers["X-Previous-Job"] = str(prev_job)

    if next_job is not None:
        response.headers["X-Next-Job"] = str(next_job)

    return db_job


@router.patch(
    "/{id}",
    response_model=schemas.Job,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
async def update_job(
    id: int, payload: schemas.JobUpdate, db: Session = Depends(get_db)
):

    db_job = crud.get_job(db, id=id)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    (updated, job) = crud.update_job(db, id, payload)

    if updated:
        if job.scan_id is not None:
            jobs = crud.get_jobs(db, scan_id=cast(int, job.scan_id))
            await send_scan_event_to_kafka(ScanUpdateEvent(id=job.scan_id, jobs=jobs))
        job = schemas.Job.from_orm(job)
        await send_job_event_to_kafka(UpdateJobEvent.from_job(job))

    return job


@router.delete(
    "/{id}",
    response_model=schemas.Job,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
async def cancel_job(
    id: int, db: Session = Depends(get_db)
):
    # Get job from database
    db_job = crud.get_job(db, id=id)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    # Turn job model into job schema
    job = schemas.Job.from_orm(db_job)
    await send_job_event_to_kafka(CancelJobEvent(job=job))

    return job