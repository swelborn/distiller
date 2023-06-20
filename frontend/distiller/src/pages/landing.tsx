import React from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import ScansIcon from '@mui/icons-material/List';
import StreamIcon from '@mui/icons-material/Stream';

import { SESSIONS_PATH, SCANS, SCANS_PATH, SESSIONS } from '../routes';
import { NavPath } from '../components/navigation';

const Container = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
  height: '100vh',
  overflow: 'hidden',
});

const LargeIcon = styled('div')({
  fontSize: '3em',
});

const StyledButton = styled(Button)({
  width: '200px', // set the width
  height: '100px', // set the height
  margin: '20px',
});

const PATHS: { [name: string]: NavPath } = (
  [
    {
      pathname: SCANS_PATH,
      icon: <ScansIcon style={{ fontSize: 60 }} />,
      label: 'Scans',
    },
    {
      pathname: SESSIONS_PATH,
      icon: <StreamIcon style={{ fontSize: 60 }} />,
      label: 'Sessions',
    },
  ] as const
).reduce((paths, path) => {
  paths[path.pathname] = { ...path };
  return paths;
}, {} as { [name: string]: NavPath });

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container>
      {Object.values(PATHS).map(({ pathname, label, icon }) => (
        <StyledButton
          key={label}
          variant="outlined"
          size="large"
          startIcon={<LargeIcon>{icon}</LargeIcon>}
          onClick={() => navigate(pathname)}
        >
          {label}
        </StyledButton>
      ))}
    </Container>
  );
};

export default LandingPage;
