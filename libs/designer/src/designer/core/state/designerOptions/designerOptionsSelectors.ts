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
