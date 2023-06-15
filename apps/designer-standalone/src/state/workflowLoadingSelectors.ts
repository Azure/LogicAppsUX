import type { RootState } from './store';
import { useSelector } from 'react-redux';

export const useIsLocal = () => {
  return useSelector((state: RootState) => state.workflowLoader.isLocalSelected);
};

export const useIsConsumption = () => {
  return useSelector((state: RootState) => state.workflowLoader.consumption);
};

export const useIsDarkMode = () => {
  return useSelector((state: RootState) => state.workflowLoader.darkMode);
};

export const useIsReadOnly = () => {
  return useSelector((state: RootState) => state.workflowLoader.readOnly);
};

export const useIsMonitoringView = () => {
  return useSelector((state: RootState) => state.workflowLoader.monitoringView);
};

export const useResourcePath = () => {
  return useSelector((state: RootState) => state.workflowLoader.resourcePath);
};

export const useAppId = () => {
  return useSelector((state: RootState) => state.workflowLoader.appId);
};

export const useShowChatBot = () => {
  return useSelector((state: RootState) => state.workflowLoader.showChatBot);
};
