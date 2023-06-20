import React, { useEffect } from 'react';
import { getJobScans } from '../features/scans';
import {
  useParams as useUrlParams,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import {
  addFetchedJobId,
  fetchedJobIdsSelector,
  getJob,
  jobSelector,
} from '../features/jobs';
import SessionCard from '../components/session-card';
import { canonicalMicroscopeName } from '../utils/microscopes';
import { SESSIONS } from '../routes';

const SessionPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const microscope = useParams().microscope;

  const jobIdParam = useUrlParams().jobId;
  const jobId = parseInt(jobIdParam as string, 10);
  const job = useAppSelector(jobSelector(jobId));
  const fetchedJobIds = useAppSelector(fetchedJobIdsSelector);

  useEffect(() => {
    if (!job) {
      dispatch(getJob({ id: jobId }));
    }
    if (job && !fetchedJobIds.includes(job.id)) {
      dispatch(getJobScans({ jobId: job.id }));
      dispatch(addFetchedJobId(job.id));
    }
  }, [dispatch, fetchedJobIds, job, jobId]);

  const onNavigateBack = () => {
    if (microscope === undefined) {
      return;
    }
    const canonicalName = canonicalMicroscopeName(microscope as string);
    navigate(`/${canonicalName}/${SESSIONS}`);
  };

  return (
    <React.Fragment>
      <IconButton onClick={onNavigateBack} color="primary">
        <ArrowBackIcon />
      </IconButton>
      {job && (
        <SessionCard
          job={job}
          isHoverable={false}
          showScans={true}
          compactMode={false}
        />
      )}
    </React.Fragment>
  );
};

export default SessionPage;
