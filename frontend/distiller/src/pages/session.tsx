import React, { useCallback, useEffect, useState } from 'react';
import ScansPage, { ScansPageProps } from './scans';
import { getJobScans, scansSelector } from '../features/scans';
import { useParams as useUrlParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import { IdType } from '../types';

export interface SessionPageProps {
  jobId?: IdType;
  showBackButton?: boolean;
}

const SessionPage: React.FC<SessionPageProps> = ({
  jobId: initialJobId,
  showBackButton: showBackButton,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const jobIdParam = useUrlParams().jobId;
  const jobId = initialJobId || parseInt(jobIdParam as string, 10);

  useEffect(() => {
    if ({initialJobId}) {
      return;
    }
    dispatch(getJobScans({ jobId: jobId }));
  }, [dispatch, jobId]);

  const scansPageProps = {
    selector: scansSelector.selectAll,
    showScansToolbar: false,
    showTablePagination: false,
    showDiskUsage: false,
    shouldFetchScans: false,
  };
  return (
    <React.Fragment>
      {showBackButton && (
        <IconButton onClick={() => navigate(-1)} color="primary">
          <ArrowBackIcon />
        </IconButton>
      )}
      <ScansPage {...scansPageProps}></ScansPage>
    </React.Fragment>
  );
};

export default SessionPage;
