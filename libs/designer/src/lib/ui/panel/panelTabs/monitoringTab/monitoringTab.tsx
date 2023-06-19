import constants from '../../../../common/constants';
import { getMonitoringTabError } from '../../../../common/utilities/error';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useBrandColor } from '../../../../core/state/selectors/actionMetadataSelector';
import { useRunData } from '../../../../core/state/workflow/workflowSelectors';
import { InputsPanel } from './inputsPanel';
import { OutputsPanel } from './outputsPanel';
import { PropertiesPanel } from './propertiesPanel';
import { RunService } from '@microsoft/designer-client-services-logic-apps';
import { ErrorSection } from '@microsoft/designer-ui';
import type { PanelTab } from '@microsoft/designer-ui';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import { useEffect } from 'react';
import { useQuery } from 'react-query';

export const MonitoringPanel: React.FC = () => {
  const selectedNodeId = useSelectedNodeId();
  const brandColor = useBrandColor(selectedNodeId);
  const runMetaData = useRunData(selectedNodeId);
  const { status: statusRun, error: errorRun, code: codeRun } = runMetaData ?? {};
  const error = getMonitoringTabError(errorRun, statusRun, codeRun);

  const getActionInputsOutputs = () => {
    return RunService().getActionLinks(runMetaData, selectedNodeId);
  };

  const {
    data: inputOutputs,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery<any>(['actionInputsOutputs', { nodeId: selectedNodeId }], getActionInputsOutputs, {
    refetchOnWindowFocus: false,
    initialData: { inputs: {}, outputs: {} },
  });

  useEffect(() => {
    refetch();
  }, [runMetaData, refetch]);

  return isNullOrUndefined(runMetaData) ? null : (
    <div>
      <ErrorSection error={error} />
      <InputsPanel
        runMetaData={runMetaData}
        brandColor={brandColor}
        isLoading={isFetching || isLoading}
        isError={isError}
        nodeId={selectedNodeId}
        values={inputOutputs.inputs}
      />
      <OutputsPanel
        runMetaData={runMetaData}
        brandColor={brandColor}
        isLoading={isFetching || isLoading}
        isError={isError}
        nodeId={selectedNodeId}
        values={inputOutputs.outputs}
      />
      <PropertiesPanel properties={runMetaData} brandColor={brandColor} nodeId={selectedNodeId} />
    </div>
  );
};

export const monitoringTab: PanelTab = {
  title: 'Parameters',
  name: constants.PANEL_TAB_NAMES.MONITORING,
  description: 'Monitoring View Tab',
  visible: true,
  content: <MonitoringPanel />,
  order: 0,
  icon: 'Info',
};
