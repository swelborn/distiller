import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { keyframes, css } from '@emotion/react';
import { useTheme } from '@mui/material/styles';
import { Card, CardContent, IconButton, Typography } from '@mui/material';
import EditableField from './editable-field';
import OutputIcon from '@mui/icons-material/Terminal';

import ScansPage from '../pages/scans';
import styled from '@emotion/styled';
import {
  CompleteJobStates,
  FailedJobStates,
  IdType,
  Job,
  JobState,
  PendingJobStates,
  RunningJobStates,
} from '../types';
import { DateTime } from 'luxon';
import { fetchedJobIdsSelector, patchJob } from '../features/jobs';
import { getScan, scansByJobIdSelector } from '../features/scans';
import JobOutputDialog from './job-output';

interface RecordingIndicatorProps {
  isVisible: boolean | null;
  color: string;
  hoverText: string;
  isPulsing: boolean | null;
}

const RecordingIndicator = styled.div<RecordingIndicatorProps>`
  display: ${({ isVisible }) => (isVisible ? 'block' : 'none')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${({ color }) => color};
  animation: ${({ isPulsing }) =>
    isPulsing
      ? css`
          ${keyframes`
            0% {
              opacity: 1;
              transform: scale(1.1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1);
            }
            100% {
              opacity: 1;
              transform: scale(1.1);
            }
          `} 2s infinite
        `
      : 'none'};
  position: relative;

  &:hover::after {
    content: '${({ hoverText }) => hoverText}';
    position: relative;
    left: -8vw;
    top: -2px;
    white-space: nowrap;
    background-color: #333;
    color: #fff;
    padding: 5px 5px;
    border-radius: 5px;
    font-size: 14px;
    z-index: 1;
  }
`;

interface HoverCardProps {
  isHoverable?: boolean;
}

// Styles for HoverCard
const HoverCard = styled(Card)<HoverCardProps>(
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
    const theme = useTheme();

    const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
      if (setHoveredJobId) setHoveredJobId(job.id);
    };

    const handleMouseLeave = () => {
      if (setHoveredJobId) setHoveredJobId(null);
    };

    const onSaveNotes = (id: IdType, notes: string) => {
      return dispatch(patchJob({ id, updates: { notes } }));
    };

    // Job state
    const getJobStateColor = (jobState: JobState) => {
      if (PendingJobStates.has(jobState)) {
        return theme.palette.warning.light;
      } else if (RunningJobStates.has(jobState)) {
        return theme.palette.success.main;
      } else if (CompleteJobStates.has(jobState)) {
        return theme.palette.primary.main;
      } else if (FailedJobStates.has(jobState)) {
        return theme.palette.error.main;
      } else {
        return theme.palette.primary.main; // Default color
      }
    };

    const jobStateColor = job.state
      ? getJobStateColor(job.state)
      : 'defaultColor';

    const isJobRunning = job.state && RunningJobStates.has(job.state);
    const isJobPending = job.state && PendingJobStates.has(job.state);

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

    const scansPageProps = {
      selector: scansByJobIdSelector(job.id),
      showScansToolbar: false,
      showTablePagination: false,
      showDiskUsage: false,
      shouldFetchScans: false,
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
            <RecordingIndicator
              isVisible={isJobRunning || isJobPending}
              isPulsing={isJobRunning}
              color={jobStateColor}
              hoverText={`${job.state}`}
            />
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
