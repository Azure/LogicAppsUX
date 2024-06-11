import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useAreTemplateServicesInitialized = () => {
  return useSelector((state: RootState) => state.designerOptions?.servicesInitialized ?? false);
};
