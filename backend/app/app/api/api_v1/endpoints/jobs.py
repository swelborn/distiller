from typing import List, cast

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.api.deps import get_db, oauth2_password_bearer_or_api_key
from app.crud import job as crud
from app.kafka.producer import send_submit_job_event_to_kafka
from app.schemas import SubmitJobEvent

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
    await send_submit_job_event_to_kafka(SubmitJobEvent(job=job, scan=scan))

    return job


@router.get(
    "",
    response_model=List[schemas.Job],
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
def read_jobs(
    skip: int = 0,
    limit: int = 100,
    with_scans: bool = False,
    db: Session = Depends(get_db),
):
    db_jobs = crud.get_jobs(db, skip=skip, limit=limit, with_scans=with_scans)
    if with_scans:
        for job in db_jobs:
            job.scans = crud.get_scans_for_job(db, job)

    return db_jobs


@router.get(
    "/{id}",
    response_model=schemas.Job,
    dependencies=[Depends(oauth2_password_bearer_or_api_key)],
)
def read_job(id: int, with_scans: bool = False, db: Session = Depends(get_db)):
    db_job = crud.get_job(db, id=id, with_scans=with_scans)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if with_scans:
        db_job.scans = crud.get_scans_for_job(db, db_job)

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

    # TODO: make scan update event into job update event
    # if updated:
    #     jobs = crud.get_jobs(db, with_scans=True)
    #     for job in jobs:
    #         job.scans = crud.get_scans_for_job(db, job)
    #     await send_scan_event_to_kafka(ScanUpdateEvent(id=job.scan_id, jobs=jobs))

    return job
