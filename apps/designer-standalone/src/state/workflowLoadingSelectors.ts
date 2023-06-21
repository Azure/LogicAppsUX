import type { RootState } from './store';
import { useSelector } from 'react-redux';

export const useIsLocal = () => {
  return useSelector((state: RootState) => state.workflowLoader.isLocal);
};

export const useIsConsumption = () => {
  return useSelector((state: RootState) => state.workflowLoader.isConsumption);
};

export const useIsDarkMode = () => {
  return useSelector((state: RootState) => state.workflowLoader.isDarkMode);
};

export const useIsReadOnly = () => {
  return useSelector((state: RootState) => state.workflowLoader.isReadOnly);
};

export const useIsMonitoringView = () => {
  return useSelector((state: RootState) => state.workflowLoader.isMonitoringView);
};

export const useResourcePath = () => {
  return useSelector((state: RootState) => state.workflowLoader.resourcePath);
};

export const useAppId = () => {
  return useSelector((state: RootState) => state.workflowLoader.appId);
};

export const useWorkflowName = () => {
  return useSelector((state: RootState) => state.workflowLoader.workflowName);
};

export const useRunId = () => {
  return useSelector((state: RootState) => state.workflowLoader.runId);
};

export const useShowChatBot = () => {
  return useSelector((state: RootState) => state.workflowLoader.showChatBot);
};
