import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  Button,
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
import {
  IdType,
  Job,
  PendingJobStates,
  RunningJobStates,
  Scan,
} from '../types';
import { DateTime } from 'luxon';
import { fetchedJobIdsSelector, patchJob } from '../features/jobs';
import { scansByJobIdSelector } from '../features/scans';
import JobOutputDialog from './job-output';
import { canonicalMicroscopeName } from '../utils/microscopes';
import JobStateComponent from './job-state';
import ImageGallery from './image-gallery';
import { cancelJob } from '../features/jobs';
import { CircularProgress } from '@mui/material';

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
  isHoverable?: boolean | undefined;
  compactMode?: boolean | undefined | null;
}

// SessionCard Component
const SessionCard = React.memo(
  ({ job, setHoveredJobId, isHoverable, compactMode }: SessionCardProps) => {
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

    const [canceling, setCanceling] = useState(false);

    const [jobOutputDialog, setJobOutputDialog] = useState<Job | undefined>();
    const onJobOutputClick = (event: React.MouseEvent, job: Job) => {
      event.stopPropagation();
      setJobOutputDialog(job);
    };

    const onJobOutputClose = () => {
      setJobOutputDialog(undefined);
    };

    const handleCancelJob = (event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent triggering of other click events
      setCanceling(true);
      dispatch(cancelJob({ id: job.id }));
    };

    useEffect(() => {
      if (job.state === 'CANCELLED') {
        setCanceling(false);
      }
    }, [job.state]);

    // Scans
    const scans = useAppSelector(scansByJobIdSelector(job.id));

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

    const isJobRunning =
      job.state &&
      ((PendingJobStates.has(job.state) && job.slurm_id) ||
        RunningJobStates.has(job.state));

    return (
      <React.Fragment>
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {isJobRunning &&
                  (canceling ? (
                    <CircularProgress size="1.5vh" />
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleCancelJob}
                      color="error"
                      size="small"
                    >
                      Cancel Session
                    </Button>
                  ))}

                {job.output && (
                  <IconButton
                    disabled={!job.output}
                    onClick={(event) => onJobOutputClick(event, job)}
                  >
                    <OutputIcon />
                  </IconButton>
                )}
                {job.state && <JobStateComponent state={job.state} />}
              </div>
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
            ></div>

            {fetchedJobIds?.includes(job.id) ? (
              scans.length > 0 ? (
                <div>
                  {compactMode ? (
                    <ImageGallery scans={scans} />
                  ) : (
                    <ScansPage {...scansPageProps} />
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent>
                    <Typography
                      variant={'body1'}
                      component="div"
                      align="center"
                    >
                      No scans for this session...
                    </Typography>
                  </CardContent>
                </Card>
              )
            ) : null}
          </CardContent>
        </HoverCard>
        <JobOutputDialog
          open={!!jobOutputDialog}
          onClose={onJobOutputClose}
          job={jobOutputDialog}
        />
      </React.Fragment>
    );
  }
);

export default SessionCard;
