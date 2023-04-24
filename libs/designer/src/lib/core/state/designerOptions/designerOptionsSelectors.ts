import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useReadOnly = () => {
  return useSelector((state: RootState) => state.designerOptions.readOnly);
};

export const useMonitoringView = () => {
  return useSelector((state: RootState) => state.designerOptions.isMonitoringView);
};

export const useTrackedPropertiesView = () => {
  return useSelector((state: RootState) => state.designerOptions.isTrackedPropertiesOnlyView);
};

export const useTrackedProperties = () => {
  return useSelector((state: RootState) => state.designerOptions.trackedProperties);
};

export const useIsConsumption = () => {
  return useSelector((state: RootState) => state.designerOptions.isConsumption);
};
