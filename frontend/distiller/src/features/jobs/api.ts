import { IdType, JobType, Job, JobsRequestResult, Scan } from '../../types';
import { apiClient } from '../../client';

export function createJob(
  type: JobType,
  scanId: IdType | null,
  machine: string,
  params: any
): Promise<Job> {
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

export function getJobs(
  withScans?: boolean,
  skip?: number,
  limit?: number
): Promise<JobsRequestResult> {
  const params: any = {};
  if (withScans !== undefined) {
    params['with_scans'] = withScans;
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

export function getJob(id: IdType, withScans?: boolean): Promise<Job> {
  const params: any = {};
  if (withScans !== undefined) {
    params['with_scans'] = withScans;
  }
  return apiClient
    .get({
      url: `jobs/${id}`,
      params,
    })
    .then((res) => res.json());
}


export function getJobScans(id: IdType): Promise<Scan[]> {

  return apiClient
    .get({
      url: `jobs/${id}/scans`,
    })
    .then((res) => res.json());
}

