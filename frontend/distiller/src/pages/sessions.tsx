// External dependencies
import React, { useCallback, useEffect, useState } from 'react';
import { isNil, groupBy } from 'lodash';
import { DateTime } from 'luxon';
import { Add } from '@mui/icons-material';
import {
  Box,
  List,
  TablePagination,
  Divider,
  Chip,
  Fab,
  ListItem,
} from '@mui/material';
import useLocalStorageState from 'use-local-storage-state';

// Internal dependencies
import {
  getJobs,
  totalCount as totalJobCount,
  selectJobsByPage,
  selectJobsByDate,
  fetchedJobIdsSelector,
  addFetchedJobId,
  setSessionJobId,
  anyStreamingJobsSelector,
} from '../features/jobs';
import { createJob } from '../features/jobs/api';
import { getJobScans } from '../features/scans';
import {
  getMachineState,
  machineSelectors,
  machineState,
} from '../features/machines';
import {
  microscopesSelectors,
  microscopesState,
} from '../features/microscopes';
import { useUrlState } from '../routes/url-state';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { IdType, Job, JobType } from '../types';
import { canRunJobs } from '../utils/machine';
import StreamingDialog from '../components/streaming-dialog';
import { dateTimeDeserializer, dateTimeSerializer } from './scans';
import { ScansToolbar } from '../components/scans-toolbar';
import { intDeserializer, intSerializer } from './scans';
import SessionCard from '../components/session-card';

const SessionsPage: React.FC = () => {
  // Job type to display (always streaming)
  let jobType = JobType.Streaming;

  // Redux Hooks
  const dispatch = useAppDispatch();

  // URL state management for page and rowsPerPage
  const [page, setPage] = useUrlState(
    'page',
    0,
    intSerializer,
    intDeserializer
  );
  const [rowsPerPage, setRowsPerPage] = useUrlState(
    'rowsPerPage',
    10,
    intSerializer,
    intDeserializer
  );

  // URL state management for date filters
  const [startDateFilter, setStartDateFilter] = useUrlState<DateTime | null>(
    'startDate',
    null,
    dateTimeSerializer,
    dateTimeDeserializer
  );

  const [endDateFilter, setEndDateFilter] = useUrlState<DateTime | null>(
    'endDate',
    null,
    dateTimeSerializer,
    dateTimeDeserializer
  );

  // Selectors
  const totalJobs = useAppSelector(totalJobCount);
  const microscopes = useAppSelector((state) =>
    microscopesSelectors.selectAll(microscopesState(state))
  );
  const machines = useAppSelector((state) =>
    machineSelectors.selectAll(machineState(state))
  );
  const fetchedJobIds = useAppSelector(fetchedJobIdsSelector);
  const jobs = useAppSelector(
    startDateFilter || endDateFilter
      ? selectJobsByDate(startDateFilter, endDateFilter, jobType)
      : selectJobsByPage(page, rowsPerPage, jobType)
  );
  const anyStreamingJobs = useAppSelector(anyStreamingJobsSelector);

  // Job-related state management
  const [hoveredJobId, setHoveredJobId] = useState<IdType | null>(null);
  const jobsGroupedByDate = groupBy(jobs, (job) =>
    // @ts-ignore: Object is possibly 'null'.
    job.submit ? DateTime.fromISO(job.submit)?.toISO()?.split('T')[0] : null
  );

  // Machine-related state management
  const [machine, setMachine] = useLocalStorageState<string>('machine', {
    defaultValue: machines.length > 0 ? machines[0].name : '',
  });

  // Microscope-related state management
  let microscopeId: IdType | undefined =
    microscopes.length > 0 ? microscopes[0].id : undefined;

  // Streaming and session related state management
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
  const onStartStreamingClick = () => {
    fetchMachineStates();
    setJobDialog(JobType.Streaming);
  };
  const onJobClose = () => setJobDialog(undefined);
  const onJobSubmit = async (type: JobType, machine: string, params: any) => {
    const returnedJob: Job = await createJob(type, null, machine, params);
    if (returnedJob) {
      dispatch(setSessionJobId(returnedJob.id));
    }
    return returnedJob;
  };
  const onStartDate = useCallback(
    (date: DateTime | null) => {
      setPage(0);
      setStartDateFilter(date);
    },
    [setPage, setStartDateFilter]
  );
  const onEndDate = useCallback(
    (date: DateTime | null) => {
      setPage(0);
      setEndDateFilter(date);
    },
    [setPage, setEndDateFilter]
  );

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

  // Effects
  useEffect(() => {
    if (hoveredJobId !== null && !fetchedJobIds.includes(hoveredJobId)) {
      dispatch(getJobScans({ jobId: hoveredJobId }));
      dispatch(addFetchedJobId(hoveredJobId));
    }
  }, [dispatch, hoveredJobId, fetchedJobIds]);

  useEffect(() => {
    if (microscopeId === undefined) return;
    dispatch(
      getJobs({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        jobType: jobType,
        start: startDateFilter || undefined,
        end: endDateFilter || undefined,
      })
    );
  }, [
    dispatch,
    page,
    rowsPerPage,
    startDateFilter,
    endDateFilter,
    jobType,
    microscopeId,
  ]);

  useEffect(() => {
    if (microscopeId === undefined) return;
    const result = microscopes.filter((m) => m.id === microscopeId);
    if (result.length === 1) document.title = `distiller - ${result[0].name}`;
  }, [microscopes, microscopeId]);

  return (
    <React.Fragment>
      <Box
        sx={{ display: 'flex', justifyContent: 'center', '& button': { m: 2 } }}
      >
        <div>
          <Fab
            color="primary"
            aria-label="start"
            disabled={anyStreamingJobs}
            onClick={onStartStreamingClick}
          >
            <Add />
          </Fab>
        </div>
      </Box>
      {Object.entries(jobsGroupedByDate)
        .sort(
          ([dateA], [dateB]) =>
            new Date(dateB).getTime() - new Date(dateA).getTime()
        )
        .map(([date, jobs], index, arr) => (
          <Box key={date} mb={3}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
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
              {index === 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ScansToolbar
                    startDate={startDateFilter}
                    endDate={endDateFilter}
                    onStartDate={onStartDate}
                    onEndDate={onEndDate}
                    showFilterBadge={
                      !isNil(startDateFilter) || !isNil(endDateFilter)
                    }
                    showExportButton={false}
                  />
                </Box>
              )}
            </Box>
            <List style={{ width: '100%' }}>
              {jobs.map((job) => (
                <ListItem key={job.id} style={{ width: '100%' }}>
                  <SessionCard
                    key={job.id}
                    job={job}
                    setHoveredJobId={setHoveredJobId}
                    isHoverable={true}
                    compactMode={true}
                  />
                </ListItem>
              ))}
            </List>
            {index < arr.length - 1 && <Divider sx={{ height: '2px' }} />}
          </Box>
        ))}
      {Object.keys(jobsGroupedByDate).length === 0 && (
        <ScansToolbar
          startDate={startDateFilter}
          endDate={endDateFilter}
          onStartDate={onStartDate}
          onEndDate={onEndDate}
          showFilterBadge={!isNil(startDateFilter) || !isNil(endDateFilter)}
          showExportButton={false}
        />
      )}
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
