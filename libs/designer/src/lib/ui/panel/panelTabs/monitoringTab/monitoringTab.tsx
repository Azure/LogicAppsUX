import constants from '../../../../common/constants';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useBrandColor } from '../../../../core/state/selectors/actionMetadataSelector';
import { useNodeMetadata } from '../../../../core/state/workflow/workflowSelectors';
import { InputsPanel } from './inputsPanel';
import { OutputsPanel } from './outputsPanel';
import { PropertiesPanel } from './propertiesPanel';
import { ErrorSection } from '@microsoft/designer-ui';
import type { PanelTab } from '@microsoft/designer-ui';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';

export const MonitoringPanel: React.FC = () => {
  const selectedNodeId = useSelectedNodeId();
  const nodeMetadata = useNodeMetadata(selectedNodeId);
  const brandColor = useBrandColor(selectedNodeId);
  const runMetaData = nodeMetadata?.runData;

  return isNullOrUndefined(runMetaData) ? null : (
    <div>
      <ErrorSection error={runMetaData.error} />
      <InputsPanel runMetaData={runMetaData} brandColor={brandColor} nodeId={selectedNodeId} />
      <OutputsPanel runMetaData={runMetaData} brandColor={brandColor} nodeId={selectedNodeId} />
      <PropertiesPanel properties={runMetaData} brandColor={brandColor} />
    </div>
  );
};

export const monitoringTab: PanelTab = {
  title: 'Monitoring',
  name: constants.PANEL_TAB_NAMES.MONITORING,
  description: 'Monitoring View Tab',
  visible: true,
  content: <MonitoringPanel />,
  order: 0,
  icon: 'Info',
};
