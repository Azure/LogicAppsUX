import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export const useAreServicesInitialized = () => {
  return useSelector((state: RootState) => state.mcpOptions?.servicesInitialized ?? false);
};
