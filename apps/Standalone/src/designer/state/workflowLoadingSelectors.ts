import type { RootState } from './store';
import { useSelector } from 'react-redux';

export const useIsLocal = () => {
  return useSelector((state: RootState) => state.workflowLoader.isLocal);
};

export const useHostingPlan = () => {
  return useSelector((state: RootState) => state.workflowLoader.hostingPlan);
};

export const useIsDarkMode = () => {
  return useSelector((state: RootState) => state.workflowLoader.isDarkMode);
};

export const useIsReadOnly = () => {
  return useSelector((state: RootState) => state.workflowLoader.isReadOnly);
};

export const useHostOptions = () => {
  return useSelector((state: RootState) => state.workflowLoader.hostOptions);
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

export const useShowConnectionsPanel = () => {
  return useSelector((state: RootState) => state.workflowLoader?.showConnectionsPanel ?? false);
};

export const useAreCustomEditorsEnabled = () => {
  return useSelector((state: RootState) => state.workflowLoader.areCustomEditorsEnabled);
};

export const useSuppressDefaultNodeSelect = () => {
  return useSelector((state: RootState) => state.workflowLoader.suppressDefaultNodeSelect);
};

export const useShowPerformanceDebug = () => {
  return useSelector((state: RootState) => state.workflowLoader.showPerformanceDebug);
};

export const useStringOverrides = () => {
  return useSelector((state: RootState) => !!state.workflowLoader.hostOptions.stringOverrides);
};

export const useRunFiles = () => {
  return useSelector((state: RootState) => state.workflowLoader.runFiles);
};

export const useRunInstance = () => {
  return useSelector((state: RootState) => state.workflowLoader.runInstance);
};

export const useQueryCachePersist = () => {
  return useSelector((state: RootState) => state.workflowLoader.queryCachePersist);
};

export const usePreventMultiVariable = () => {
  return useSelector((state: RootState) => state.workflowLoader.hostOptions.preventMultiVariable);
};
