import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useReadOnly = () => {
  return useSelector((state: RootState) => state.designerOptions.readOnly);
};

export const useMonitoringView = () => {
  return useSelector((state: RootState) => state.designerOptions.isMonitoringView);
};

export const useLegacyWorkflowParameters = () => {
  return useSelector((state: RootState) => state.designerOptions.useLegacyWorkflowParameters);
};
export const useHostOptions = () => {
  return useSelector((state: RootState) => state.designerOptions.hostOptions);
};

export const useIsXrmConnectionReferenceMode = () => {
  return useSelector((state: RootState) => state.designerOptions.isXrmConnectionReferenceMode);
};

export const useIsDarkMode = () => {
  return useSelector((state: RootState) => state.designerOptions.isDarkMode);
};

export const useSuppressDefaultNodeSelectFunctionality = () => {
  return useSelector((state: RootState) => state.designerOptions.suppressDefaultNodeSelectFunctionality);
};

export const useNodeSelectAdditionalCallback = () => {
  return useSelector((state: RootState) => state.designerOptions.nodeSelectAdditionalCallback);
};

export const usePanelTabHideKeys = () => {
  return useSelector((state: RootState) => state.designerOptions.panelTabHideKeys ?? []);
};

export const useShowConnectionsPanel = () => {
  return useSelector((state: RootState) => state.designerOptions?.showConnectionsPanel ?? false);
};

export const useShowPerformanceDebug = () => {
  return useSelector((state: RootState) => state.designerOptions.showPerformanceDebug ?? false);
};

export const useAreDesignerOptionsInitialized = () => {
  return useSelector((state: RootState) => state.designerOptions?.designerOptionsInitialized ?? false);
};

export const useAreServicesInitialized = () => {
  return useSelector((state: RootState) => state.designerOptions?.servicesInitialized ?? false);
};
