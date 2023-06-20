import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  Card,
  CardContent,
  CardProps,
  IconButton,
  Typography,
} from '@mui/material';
import EditableField from './editable-field';
import OutputIcon from '@mui/icons-material/Terminal';

import ScansPage from '../pages/scans';
import styled from '@emotion/styled';
import { IdType, Job, Scan } from '../types';
import { DateTime } from 'luxon';
import { fetchedJobIdsSelector, patchJob } from '../features/jobs';
import { getScan, scansByJobIdSelector } from '../features/scans';
import JobOutputDialog from './job-output';
import { canonicalMicroscopeName } from '../utils/microscopes';
import JobStateComponent from './job-state';

interface HoverCardProps extends CardProps {
  isHoverable?: boolean;
}

const HoverCard = styled(({ isHoverable, ...props }: HoverCardProps) => (
  <Card {...props} />
))<HoverCardProps>(
  {
    width: '100%',
    transition: 'transform 0.15s ease-in-out',
    boxShadow: '0 4px 6px 0 hsla(0, 0%, 0%, 0.2)',
  },
  ({ isHoverable }) =>
    isHoverable
      ? {
          '&:hover': {
            transform: 'scale3d(1.05, 1.05, 1)',
          },
        }
      : {}
);

interface SessionCardProps {
  job: Job;
  setHoveredJobId?: React.Dispatch<React.SetStateAction<IdType | null>>;
  showScans?: boolean;
  isHoverable?: boolean | undefined;
  compactMode?: boolean | undefined | null;
}

// SessionCard Component
const SessionCard = React.memo(
  ({
    job,
    setHoveredJobId,
    showScans,
    isHoverable,
    compactMode,
  }: SessionCardProps) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
      if (setHoveredJobId) setHoveredJobId(job.id);
    };

    const handleMouseLeave = () => {
      if (setHoveredJobId) setHoveredJobId(null);
    };

    const onSaveNotes = (id: IdType, notes: string) => {
      return dispatch(patchJob({ id, updates: { notes } }));
    };

    const [jobOutputDialog, setJobOutputDialog] = useState<Job | undefined>();
    const onJobOutputClick = (job: Job) => {
      setJobOutputDialog(job);
    };

    const onJobOutputClose = () => {
      setJobOutputDialog(undefined);
    };

    // Scans
    const scans = useAppSelector(scansByJobIdSelector(job.id));

    // Effect to update the scans for a job if an update comes in.
    useEffect(() => {
      // If the job or allScans are not yet loaded, do nothing:
      if (!job || !scans) {
        return;
      }

      // For each scanId in the job, check if it exists in the store,
      // and if not, dispatch the getScan action:
      job.scanIds.forEach((scanId) => {
        if (!scans.some((scan) => scan.id === scanId)) {
          dispatch(getScan({ id: scanId }));
        }
      });
    }, [dispatch, job, scans]);

    // Navigation
    const microscopeName = useParams().microscope;
    const onScanClick = (event: React.MouseEvent, scan: Scan) => {
      event.stopPropagation();
      const canonicalName = canonicalMicroscopeName(microscopeName as string);
      navigate(`/${canonicalName}/sessions/${job.id}/scans/${scan.id}`);
    };

    const scansPageProps = {
      selector: scansByJobIdSelector(job.id),
      showScansToolbar: false,
      showTablePagination: false,
      showDiskUsage: false,
      shouldFetchScans: false,
      onScanClick: onScanClick,
    };

    const fetchedJobIds = useAppSelector(fetchedJobIdsSelector);

    return (
      <HoverCard
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          if (isHoverable) navigate(`${job.id}`);
        }}
        isHoverable={isHoverable}
      >
        <CardContent style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h5" component="div">
              {job.id}
            </Typography>
            {job.state && <JobStateComponent state={job.state} />}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" component="div">
              {job.submit
                ? DateTime.fromISO(job.submit).toLocaleString(
                    DateTime.TIME_SIMPLE
                  )
                : ''}
            </Typography>
            <EditableField
              value={job!.notes || ''}
              onSave={(value) => onSaveNotes(job.id, value)}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <IconButton
              disabled={!job.output}
              onClick={() => onJobOutputClick(job)}
            >
              <OutputIcon />
            </IconButton>
          </div>
          {fetchedJobIds?.includes(job.id) ? (
            scans.length > 0 ? (
              showScans && (
                <div
                  style={
                    compactMode
                      ? {
                          maxHeight: '50vh',
                          overflowY: 'auto',
                          padding: '1%',
                        }
                      : {}
                  }
                >
                  <ScansPage {...scansPageProps}></ScansPage>
                </div>
              )
            ) : (
              <Card>
                <CardContent>
                  <Typography variant={'body1'} component="div" align="center">
                    No scans for this session...
                  </Typography>
                </CardContent>
              </Card>
            )
          ) : null}
        </CardContent>
        <JobOutputDialog
          open={!!jobOutputDialog}
          onClose={onJobOutputClose}
          job={jobOutputDialog}
        />
      </HoverCard>
    );
  }
);

export default SessionCard;
