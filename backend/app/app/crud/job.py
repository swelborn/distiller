from typing import Tuple, Union, Optional

from sqlalchemy import desc, or_, update
from sqlalchemy.orm import Session, noload

from app import models, schemas
from app.crud import scan as scan_crud


def get_job(db: Session, id: int, with_scans: bool = False) -> Union[models.Job, None]:
    query = db.query(models.Job)

    if not with_scans:
        query = query.options(noload(models.Job.scans))

    return query.filter(models.Job.id == id).first()


def get_scans_for_job(db: Session, job: models.Job):
    return [scan_crud.get_scan(db, scan.id, with_jobs=False) for scan in job.scans]


def get_job_by_slurm_id(db: Session, slurm_id: int):
    return db.query(models.Job).filter(models.Job.slurm_id == slurm_id).first()


def _get_jobs_query(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    slurm_id: Optional[int] = None,
    with_scans: Optional[bool] = False,
    job_type: Optional[schemas.JobType] = None,
):
    query = db.query(models.Job)

    if not with_scans:
        query = query.options(noload(models.Job.scans))

    if slurm_id is not None:
        query = query.filter(models.Job.slurm_id == slurm_id)

    if job_type is not None:
        query = query.filter(models.Job.job_type == job_type)

    return query


def get_jobs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    slurm_id: Optional[int] = None,
    with_scans: Optional[bool] = False,
    job_type: Optional[schemas.JobType] = None,
):
    query = _get_jobs_query(db, skip, limit, slurm_id, with_scans, job_type)

    return query.order_by(desc(models.Job.id)).offset(skip).limit(limit).all()


def get_jobs_count(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    slurm_id: Optional[int] = None,
    with_scans: Optional[bool] = False,
    job_type: Optional[schemas.JobType] = None,
):
    query = _get_jobs_query(db, skip, limit, slurm_id, with_scans, job_type)

    return query.count()


def create_job(db: Session, job: schemas.JobCreate):
    _job = job.dict()
    del _job["scan_id"]
    db_job = models.Job(**_job)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    return db_job


def update_job(
    db: Session, id: int, updates: schemas.JobUpdate
) -> Tuple[bool, models.Job]:
    statement = update(models.Job).where(models.Job.id == id)

    or_comparisons = []
    updated = False

    if updates.state is not None:
        statement = statement.values(state=updates.state)
        or_comparisons.append(models.Job.state != updates.state)

    if updates.slurm_id is not None:
        statement = statement.values(slurm_id=updates.slurm_id)
        or_comparisons.append(models.Job.slurm_id != updates.slurm_id)
        or_comparisons.append(models.Job.slurm_id == None)

    if updates.output is not None:
        statement = statement.values(output=updates.output)
        or_comparisons.append(models.Job.output != updates.output)
        or_comparisons.append(models.Job.output == None)

    if updates.elapsed is not None:
        statement = statement.values(elapsed=updates.elapsed)
        or_comparisons.append(models.Job.elapsed != updates.elapsed)
        or_comparisons.append(models.Job.elapsed == None)

    if updates.submit is not None:
        statement = statement.values(submit=updates.submit)
        or_comparisons.append(models.Job.submit != updates.submit)
        or_comparisons.append(models.Job.submit == None)

    if updates.notes is not None:
        statement = statement.values(notes=updates.notes)
        or_comparisons.append(models.Job.notes != updates.notes)
        or_comparisons.append(models.Job.notes == None)

    if updates.scan_id is not None:
        scan = scan_crud.get_scan(db, updates.scan_id)

        if scan is None:
            raise Exception(f"Scan with id {updates.scan_id} does not exist.")

        job = get_job(db, id, with_scans=True)
        scans_updated = False

        if job is not None and not any([s.id == updates.scan_id for s in job.scans]):
            job.scans.append(scan)
            scans_updated = True

        updated = updated or scans_updated

    if or_comparisons:
        statement = statement.where(or_(*or_comparisons))

        resultproxy = db.execute(statement)
        updated = resultproxy.rowcount == 1 or updated

    db.commit()

    return (updated, get_job(db, id, with_scans=False))


def get_prev_next_job(
    db: Session, id: int
) -> Tuple[Union[int, None], Union[int, None]]:
    # Fetch the job so we can constrain by microscope id
    job = get_job(db, id)

    if job is None:
        raise Exception("Invalid job id: {id}")

    prev_job = (
        db.query(models.Job.id)
        .order_by(models.Job.id.desc())
        .filter(models.Job.job_type == job.job_type)
        .filter(models.Job.id < id)
        .limit(1)
        .scalar()
    )
    next_job = (
        db.query(models.Job.id)
        .order_by(models.Job.id.asc())
        .filter(models.Job.job_type == job.job_type)
        .filter(models.Job.id > id)
        .limit(1)
        .scalar()
    )

    return (prev_job, next_job)
