import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useReadOnly = () => {
  return useSelector((state: RootState) => state.designerOptions.readOnly);
};

export const useMonitoringView = () => {
  return useSelector((state: RootState) => state.designerOptions.isMonitoringView);
};

export const useTokenSelectorView = () => {
  return useSelector((state: RootState) => state.designerOptions.isTokenSelectorOnlyView);
};

export const useTokenSelectorData = () => {
  return useSelector((state: RootState) => state.designerOptions.tokenSelectorViewProps);
};

export const useIsConsumption = () => {
  return useSelector((state: RootState) => state.designerOptions.isConsumption);
};
