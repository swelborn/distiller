import { IdType, JobType, Job, ScanJob, JobsRequestResult } from '../../types';
import { apiClient } from '../../client';
import { pickNil } from '../../utils';


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

export function getJobs(
  job_type?: JobType,
  skip?: number,
  limit?: number
): Promise<JobsRequestResult> {
  const params: any = {};
  if (job_type !== undefined) {
    params['job_type'] = job_type;
  }
  if (skip !== undefined) {
    params['skip'] = skip;
  }
  if (limit !== undefined) {
    params['limit'] = limit;
  }

  return apiClient
    .get({
      url: 'jobs',
      params,
    })
    .then((res) => {
      return res.json().then((jobs) => {
        let totalCount = -1;

        const totalJobCountHeader = res.headers.get('x-total-count');
        if (totalJobCountHeader != null) {
          totalCount = Number.parseInt(totalJobCountHeader);
        }

        const jobsRequestResult = {
          jobs,
          totalCount,
        };

        return new Promise<JobsRequestResult>((resolve) => {
          resolve(jobsRequestResult);
        });
      });
    });
}

export function getJob(id: IdType): Promise<Job> {
  return apiClient
    .get({
      url: `jobs/${id}`,
    })
    .then((res) => res.json());
}
