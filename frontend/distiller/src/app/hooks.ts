import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { useLocation } from 'react-router-dom';
import { AUTH_PATH, HOME_PATH } from '../routes';
// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useShouldShowNavigation = () => {
  const location = useLocation();
  const showNavigation = ![AUTH_PATH, HOME_PATH, '/4dcamera/'].includes(
    location.pathname
  );

  return showNavigation;
};
