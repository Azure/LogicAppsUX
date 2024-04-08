import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useReduxActionCounts = () => {
  return useSelector((state: RootState) => state.dev.reduxActionCounts ?? {});
};
