import constants from '../../../../common/constants';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useBrandColor } from '../../../../core/state/selectors/actionMetadataSelector';
import { useNodeMetadata } from '../../../../core/state/workflow/workflowSelectors';
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
  const nodeMetadata = useNodeMetadata(selectedNodeId);
  const brandColor = useBrandColor(selectedNodeId);
  const runMetaData = nodeMetadata?.runData;

  const getActionInputsOutputs = () => {
    return RunService().getActionLinks(runMetaData, selectedNodeId);
  };

  const {
    data: inputOutputs,
    isLoading: isInputOutputsLoading,
    refetch,
  } = useQuery<any>(['actionInputsOutputs'], getActionInputsOutputs, {
    refetchOnWindowFocus: false,
    initialData: { inputs: {}, outputs: {} },
  });

  useEffect(() => {
    refetch();
  }, [runMetaData]);

  return isNullOrUndefined(runMetaData) ? null : (
    <div>
      <ErrorSection error={runMetaData.error} />
      <InputsPanel
        runMetaData={runMetaData}
        brandColor={brandColor}
        isLoading={isInputOutputsLoading}
        nodeId={selectedNodeId}
        values={inputOutputs.inputs}
      />
      <OutputsPanel
        runMetaData={runMetaData}
        brandColor={brandColor}
        isLoading={isInputOutputsLoading}
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
