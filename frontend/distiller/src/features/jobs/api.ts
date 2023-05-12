import { IdType, JobType, ScanJob, Job } from '../../types';
import { apiClient } from '../../client';

export function createJob(
  type: JobType,
  scanId: IdType | null,
  machine: string,
  params: any
): Promise<ScanJob> {
  const payload = {
    job_type: type,
    scan_id: scanId,
    machine,
    params,
  };

  return apiClient
    .post({
      url: 'jobs',
      json: payload,
    })
    .then((res) => res.json());
}

export function cancelJob(
  jobid: IdType,
): Promise<Job> {

  return apiClient
    .delete({
      url: 'jobs/' + jobid,
    })
    .then((res) => res.json());
}