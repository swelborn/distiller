from typing import List, cast, Union

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app import schemas
from app.api.deps import get_db, oauth2_password_bearer_or_api_key
from app.crud import job as crud
from app.kafka.producer import send_job_event_to_kafka
from app.schemas import SubmitJobEvent, UpdateJobEvent, CancelJobEvent

router = APIRouter()


@router.post(
    "",
    response_model=schemas.Job,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
async def create_job(job_create: schemas.JobCreate, db: Session = Depends(get_db)):
    scan_id = job_create.scan_id
    job = crud.create_job(db=db, job=job_create)

    if scan_id is not None:
        job_update = schemas.JobUpdate(scan_id=scan_id)
        (updated, job) = crud.update_job(db, cast(int, job.id), job_update)

    db.refresh(job)
    job = crud.get_job(db, job.id, with_scans=True)
    scans_without_jobs = crud.get_scans_for_job(db, job)
    job.scans = scans_without_jobs
    
    if job.scans:
        scan = job.scans[0]
    else:
        scan = None
    await send_job_event_to_kafka(SubmitJobEvent(job=job, scan=scan))

    return job


@router.get(
    "",
    response_model=List[schemas.Job],
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
def read_jobs(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    with_scans: bool = False,
    job_type: Union[schemas.JobType, None] = None,
    db: Session = Depends(get_db),
):
    db_jobs = crud.get_jobs(
        db, skip=skip, limit=limit, with_scans=with_scans, job_type=job_type
    )
    count = crud.get_jobs_count(
        db, skip=skip, limit=limit, with_scans=with_scans, job_type=job_type
    )
    response.headers["X-Total-Count"] = str(count)

    if with_scans:
        for job in db_jobs:
            job.scans = crud.get_scans_for_job(db, job)

    return db_jobs


@router.get(
    "/{id}",
    response_model=schemas.Job,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
def read_job(
    response: Response, id: int, with_scans: bool = False, db: Session = Depends(get_db)
):
    db_job = crud.get_job(db, id=id, with_scans=with_scans)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if with_scans:
        db_job.scans = crud.get_scans_for_job(db, db_job)

    (prev_job, next_job) = crud.get_prev_next_job(db, id)

    if prev_job is not None:
        response.headers["X-Previous-Job"] = str(prev_job)

    if next_job is not None:
        response.headers["X-Next-Job"] = str(next_job)

    return db_job


@router.get(
    "/{id}/scans",
    response_model=List[schemas.Scan],
    response_model_by_alias=False,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
def read_job_scans(id: int, db: Session = Depends(get_db)):
    db_job = crud.get_job(db, id=id, with_scans=True)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return crud.get_scans_for_job(db, db_job)


@router.patch(
    "/{id}",
    response_model=schemas.Job,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
async def update_job(
    id: int, payload: schemas.JobUpdate, db: Session = Depends(get_db)
):
    db_job = crud.get_job(db, id=id, with_scans=False)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    (updated, job) = crud.update_job(db, id, payload)

    if updated:
        job = schemas.Job.from_orm(job)
        await send_job_event_to_kafka(UpdateJobEvent.from_job(job))

    return job


@router.delete(
    "/{id}",
    response_model=schemas.Job,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
async def cancel_job(id: int, db: Session = Depends(get_db)):
    # Get job from database
    db_job = crud.get_job(db, id=id)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    # Turn job model into job schema
    job = schemas.Job.from_orm(db_job)
    await send_job_event_to_kafka(CancelJobEvent(job=job))

    return job
