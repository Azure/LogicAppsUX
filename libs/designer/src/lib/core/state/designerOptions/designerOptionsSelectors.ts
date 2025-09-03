import type { RootState } from '../../store';
import { useSelector } from 'react-redux';
import { useIsAgenticWorkflow } from '../designerView/designerViewSelectors';
import { useOperationInfo } from '../selectors/actionMetadataSelector';
import { useEffect, useState } from 'react';
import { equals } from '@microsoft/logic-apps-shared';
import { getSupportedChannels } from '../../utils/agent';
import constants from '../../../common/constants';

export const useReadOnly = () => {
  return useSelector((state: RootState) => state.designerOptions.readOnly);
};

export const useMonitoringView = () => {
  return useSelector((state: RootState) => state.designerOptions.isMonitoringView);
};

export const useUnitTest = () => {
  return useSelector((state: RootState) => state.designerOptions.isUnitTest);
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

export const useIsVSCode = () => {
  return useSelector((state: RootState) => state.designerOptions.isVSCode);
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

export const useShowEdgeDrawing = () => {
  return useSelector((state: RootState) => state.designerOptions?.showEdgeDrawing ?? false);
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

export const useSupportedChannels = (nodeId: string) => {
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const operationInfo = useOperationInfo(nodeId);
  const [supportedChannels, setSupportedChannels] = useState<any[]>([]);

  useEffect(() => {
    const refreshChannels = async () => {
      if (equals(operationInfo.type ?? '', constants.NODE.TYPE.AGENT) && isAgenticWorkflow) {
        const channels = await getSupportedChannels(nodeId, operationInfo);
        setSupportedChannels(channels);
      }
    };

    refreshChannels();
  }, [isAgenticWorkflow, nodeId, operationInfo]);

  return supportedChannels;
};
