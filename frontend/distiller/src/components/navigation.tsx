import React from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import ScansIcon from '@mui/icons-material/List';
import StreamIcon from '@mui/icons-material/Stream';
import { HOME_PATH, SESSIONS_PATH } from '../routes';

type NavPath = {
  pathname: string;
  icon: React.ReactNode;
  label: string;
};

const PATHS: { [name: string]: NavPath } = (
  [
    { pathname: HOME_PATH, icon: <ScansIcon />, label: 'Home' },
    { pathname: SESSIONS_PATH, icon: <StreamIcon />, label: 'Sessions' },
  ] as const
).reduce((paths, path) => {
  paths[path.pathname] = { ...path };
  return paths;
}, {} as { [name: string]: NavPath });

const NavigationComponent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <BottomNavigation
      value={location.pathname}
      onChange={(_event, pathname) => {
        navigate(pathname);
      }}
      showLabels
      sx={{ width: '100%' }}
    >
      {Object.values(PATHS).map(({ pathname, icon, label }) => (
        <BottomNavigationAction
          key={pathname}
          value={pathname}
          label={label}
          icon={icon}
        />
      ))}
    </BottomNavigation>
  );
};

export default NavigationComponent;
