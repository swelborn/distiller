import React, { useState } from 'react';

import { Box, Button } from '@mui/material';

import { useParams as useUrlParams } from 'react-router-dom';
import useLocalStorageState from 'use-local-storage-state';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import StreamingDialog from '../components/streaming-dialog';
import { createJob, cancelJob } from '../features/jobs/api';
import {
  getMachineState,
  machineSelectors,
  machineState,
} from '../features/machines';
import { IdType, JobType, Job, ScanJob } from '../types';
import { canRunJobs } from '../utils/machine';
import ScansPage, { ScansPageProps } from './scans';

const StreamingPage: React.FC = () => {
  // App dispatch
  const dispatch = useAppDispatch();

  // Scan IDs
  const scanIdParam = useUrlParams().scanId;
  const scanId = parseInt(scanIdParam as string);

  // Job ID of current session
  const [sessionJobId, setSessionJobId] = useState<IdType | null>(null);

  // States
  const [showScansPage, setShowScansPage] = useState<boolean>(false);
  const [startStreaming, setStartStreaming] = useState<boolean>(false);
  const [startSessionDisabled, setStartSessionDisabled] =
    useState<boolean>(false);
  const [endSessionDisabled, setEndSessionDisabled] = useState<boolean>(true);
  const [jobDialog, setJobDialog] = useState<JobType | undefined>();

  // Machines
  const machines = useAppSelector((state) =>
    machineSelectors.selectAll(machineState(state))
  );
  const machineNames = machines.map((machine) => machine.name);
  const [machine, setMachine] = useLocalStorageState<string>('machine', {
    defaultValue: machines.length > 0 ? machines[0].name : '',
  });

  const fetchMachineStates = () => {
    machines.forEach((machine) => {
      dispatch(getMachineState(machine));
    });
  };

  const onStartStreamingClick = () => {
    fetchMachineStates();
    setJobDialog(JobType.Streaming);
  };

  const onJobSubmit = async (type: JobType, machine: string, params: any) => {
    handleStartSessionClick();
    // Use await to wait for the promise to resolve and store the returned job
    const returnedJob: ScanJob = await createJob(type, scanId, machine, params);
    setSessionJobId(returnedJob.id); // Store job id in state assuming 'id' is the property in returnedJob
    return returnedJob;
  };

  const onJobClose = () => {
    setJobDialog(undefined);
  };

  // Handles
  const handleStartSessionClick = () => {
    setShowScansPage(true);
    setStartStreaming(true);
    setEndSessionDisabled(false);
    setStartSessionDisabled(true);
  };

  // cancelJob(jobid);

  const handleEndSessionClick = async () => {
    if (sessionJobId !== null) {
      const returnedJob: Job = await cancelJob(sessionJobId);
      setSessionJobId(null); // Reset job id after cancellation
    }
    setShowScansPage(false);
    setStartStreaming(false);
    setEndSessionDisabled(true);
    setStartSessionDisabled(false);
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

  // Props for scans page
  const scansPageProps: ScansPageProps = {
    hideDiskUsageBar: true,
    startStreaming: startStreaming,
  };

  return (
    <React.Fragment>
      <Box
        sx={{ display: 'flex', justifyContent: 'center', '& button': { m: 1 } }}
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
      {showScansPage && <ScansPage {...scansPageProps} />}

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

export default StreamingPage;
