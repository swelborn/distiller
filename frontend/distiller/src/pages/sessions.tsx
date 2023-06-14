// External dependencies
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNil, groupBy } from 'lodash';
import { DateTime } from 'luxon';
import { styled } from '@mui/material/styles';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  List,
  ListItem,
  TablePagination,
  Typography,
  Popper,
  Divider,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import useLocalStorageState from 'use-local-storage-state';

// Internal dependencies
import {
  allJobsSelector,
  getJobs,
  totalCount as totalJobCount,
  patchJob,
} from '../features/jobs';
import { createJob } from '../features/jobs/api';
import { getJobScans, scansSelector } from '../features/scans';
import {
  getMachineState,
  machineSelectors,
  machineState,
} from '../features/machines';
import {
  microscopesSelectors,
  microscopesState,
} from '../features/microscopes';
import { Serializer, Deserializer, useUrlState } from '../routes/url-state';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { IdType, Job, JobType, Microscope } from '../types';
import { canRunJobs } from '../utils/machine';
import { canonicalMicroscopeName } from '../utils/microscopes';
import StreamingDialog from '../components/streaming-dialog';
import SessionPage from './session';
import EditableField from '../components/editable-field';

// Styles for HoverCard
const HoverCard = styled(Card)({
  width: '100%',
  transition: 'transform 0.15s ease-in-out',
  boxShadow: '0 4px 6px 0 hsla(0, 0%, 0%, 0.2)',
  '&:hover': {
    transform: 'scale3d(1.05, 1.05, 1)',
  },
});

// Properties for MemoListItem
interface MemoListItemProps {
  job: Job;
  setHoveredJobId: React.Dispatch<React.SetStateAction<IdType | null>>;
  hoveredJobId: IdType | null;
  enablePreview: boolean;
  notesValue: string;
  onSaveNotes: (value: string) => Promise<any>;
}

// MemoListItem Component
const MemoListItem = React.memo(
  ({
    job,
    setHoveredJobId,
    hoveredJobId,
    enablePreview,
    notesValue,
    onSaveNotes,
  }: MemoListItemProps) => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
      setHoveredJobId(job.id);
      setAnchorEl(event.currentTarget);
    };

    const handleMouseLeave = () => {
      setHoveredJobId(null);
      setAnchorEl(null);
    };

    return (
      <ListItem key={job.id} style={{ width: '100%' }}>
        <HoverCard
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => navigate(`${job.id}`)}
        >
          <CardContent>
            <Typography variant="h5" component="div">
              {job.id}
            </Typography>
            <Typography variant="h6" component="div">
              {job.submit
                ? DateTime.fromISO(job.submit).toLocaleString(
                    DateTime.TIME_SIMPLE
                  )
                : ''}
            </Typography>
            <EditableField value={notesValue} onSave={onSaveNotes} />
          </CardContent>
        </HoverCard>
        {enablePreview && (
          <Popper
            open={Boolean(anchorEl) && hoveredJobId === job.id}
            anchorEl={anchorEl}
          >
            <SessionPage jobId={hoveredJobId ?? undefined}></SessionPage>
          </Popper>
        )}
      </ListItem>
    );
  }
);

export const intSerializer: Serializer<number> = (n) => {
  if (isNil(n)) {
    return '';
  } else {
    return n.toString();
  }
};

export const intDeserializer: Deserializer<number> = (nStr) => {
  const n = parseInt(nStr);

  if (!Number.isFinite(n)) {
    return undefined;
  }

  return n;
};

const SessionsPage: React.FC = () => {
  // Redux Hooks
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Selectors
  const jobs = useAppSelector(allJobsSelector);
  const scans = useAppSelector(scansSelector.selectAll);
  const totalJobs = useAppSelector(totalJobCount);
  const microscopes = useAppSelector((state) =>
    microscopesSelectors.selectAll(microscopesState(state))
  );
  const machines = useAppSelector((state) =>
    machineSelectors.selectAll(machineState(state))
  );

  // URL state management for page and rowsPerPage
  const [page, setPage] = useUrlState(
    'page',
    0,
    intSerializer,
    intDeserializer
  );
  const [rowsPerPage, setRowsPerPage] = useUrlState(
    'rowsPerPage',
    20,
    intSerializer,
    intDeserializer
  );

  // Job-related state management
  const [hoveredJobId, setHoveredJobId] = useState<IdType | null>(null);
  const [sessionJobId, setSessionJobId] = useState<IdType | null>(null);
  const [enablePreview, setEnablePreview] = useState<boolean>(false);
  const jobsGroupedByDate = groupBy(jobs, (job) =>
    job.submit ? DateTime.fromISO(job.submit).toISO().split('T')[0] : undefined
  );

  // Machine-related state management
  const machineNames = machines.map((machine) => machine.name);
  const [machine, setMachine] = useLocalStorageState<string>('machine', {
    defaultValue: machines.length > 0 ? machines[0].name : '',
  });

  // Microscope-related state management
  let microscope: Microscope | null = null;
  const microscopesByCanonicalName = microscopes.reduce(
    (obj: { [key: string]: Microscope }, microscope) => {
      obj[canonicalMicroscopeName(microscope.name)] = microscope;
      return obj;
    },
    {}
  );
  let microscopeId: IdType | undefined =
    microscopes.length > 0 ? microscopes[0].id : undefined;

  // Streaming and session related state management
  const [showScansPage, setShowScansPage] = useState<boolean>(false);
  const [startStreaming, setStartStreaming] = useState<boolean>(false);
  const [startSessionDisabled, setStartSessionDisabled] =
    useState<boolean>(false);
  const [endSessionDisabled, setEndSessionDisabled] = useState<boolean>(true);
  const [jobDialog, setJobDialog] = useState<JobType | undefined>();

  // Event Handlers
  const onChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    page: number
  ) => setPage(page);
  const onChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const jobsPerPage = +event.target.value;
    setRowsPerPage(jobsPerPage);
    setPage(0);
  };
  const handleStartSessionClick = () => {
    setShowScansPage(true);
    setStartStreaming(true);
    setEndSessionDisabled(false);
    setStartSessionDisabled(true);
  };
  const handleEndSessionClick = async () => {
    setShowScansPage(false);
    setStartStreaming(false);
    setEndSessionDisabled(true);
    setStartSessionDisabled(false);
  };
  const onStartStreamingClick = () => {
    fetchMachineStates();
    setJobDialog(JobType.Streaming);
  };
  const onJobClose = () => setJobDialog(undefined);
  const onJobSubmit = async (type: JobType, machine: string, params: any) => {
    handleStartSessionClick();
    const returnedJob: Job = await createJob(type, null, machine, params);
    setSessionJobId(returnedJob.id);
    return returnedJob;
  };
  const handleTogglePreview = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEnablePreview(event.target.checked);
  };
  const allowRunningJobs = () => {
    let canRun = false;
    for (let m of machines) {
      if (m.name === machine) {
        canRun = canRunJobs(m.status);
        break;
      }
    }
    return canRun;
  };
  const fetchMachineStates = () =>
    machines.forEach((machine) => dispatch(getMachineState(machine)));
  const onSaveNotes = (id: IdType, notes: string) => {
    return dispatch(patchJob({ id, updates: { notes } }));
  };

  // Effects
  useEffect(() => {
    if (hoveredJobId !== null && enablePreview)
      dispatch(getJobScans({ jobId: hoveredJobId }));
  }, [dispatch, scans, hoveredJobId]);

  useEffect(() => {
    if (microscopeId === undefined) return;
    dispatch(
      getJobs({
        withScans: false,
        skip: page * rowsPerPage,
        limit: rowsPerPage,
      })
    );
  }, [dispatch, page, rowsPerPage]);

  useEffect(() => {
    if (microscopeId === undefined) return;
    const result = microscopes.filter((m) => m.id === microscopeId);
    if (result.length === 1) document.title = `distiller - ${result[0].name}`;
  }, [microscopes, microscopeId]);

  return (
    <React.Fragment>
      <FormControlLabel
        control={
          <Switch
            checked={enablePreview}
            onChange={handleTogglePreview}
            color="primary"
          />
        }
        label="Enable Preview"
      />
      <Box
        sx={{ display: 'flex', justifyContent: 'center', '& button': { m: 2 } }}
      >
        <div>
          <Button
            disabled={startSessionDisabled}
            color="primary"
            variant="contained"
            onClick={onStartStreamingClick}
          >
            Start New Streaming Session
          </Button>
          <Button
            disabled={endSessionDisabled}
            color="error"
            variant="contained"
            onClick={handleEndSessionClick}
          >
            End Current Streaming Session
          </Button>
        </div>
      </Box>
      {Object.entries(jobsGroupedByDate)
        .sort(
          ([dateA], [dateB]) =>
            new Date(dateB).getTime() - new Date(dateA).getTime()
        )
        .map(([date, jobs], index, arr) => (
          <Box key={date} mb={3}>
            <Chip
              label={date}
              variant="filled"
              color="primary"
              sx={{
                height: 'auto',
                padding: '15px',
                fontSize: '1.2rem',
              }}
            />
            <List style={{ width: '100%' }}>
              {jobs.map((job) => (
                <MemoListItem
                  job={job}
                  setHoveredJobId={setHoveredJobId}
                  hoveredJobId={hoveredJobId}
                  enablePreview={enablePreview}
                  notesValue={job.notes || ''}
                  onSaveNotes={(notesValue) => onSaveNotes(job.id, notesValue)}
                />
              ))}
            </List>
            {index < arr.length - 1 && <Divider sx={{ height: '2px' }} />}
          </Box>
        ))}

      <TablePagination
        rowsPerPageOptions={[10, 20, 100]}
        component="div"
        count={totalJobs}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onChangePage}
        onRowsPerPageChange={onChangeRowsPerPage}
        labelRowsPerPage="Sessions per page"
      />
      <StreamingDialog
        open={jobDialog === JobType.Streaming}
        machines={machines}
        machine={machine}
        setMachine={setMachine}
        onClose={onJobClose}
        onSubmit={(params) => onJobSubmit(JobType.Streaming, machine, params)}
        canRun={allowRunningJobs}
      />
    </React.Fragment>
  );
};

export default SessionsPage;
