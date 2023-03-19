import constants from '../../../../common/constants';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useOperationInfo } from '../../../../core/state/selectors/actionMetadataSelector';
import { useStaticResultSchema } from '../../../../core/state/staticresultschema/staitcresultschemaselector';
import type { PanelTab } from '@microsoft/designer-ui';
import { StaticResult } from '@microsoft/designer-ui';

export const TestingPanel: React.FC = () => {
  const selectedNode = useSelectedNodeId();
  const operationInfo = useOperationInfo(selectedNode);
  const { connectorId, operationId } = operationInfo;
  const staticResultSchema = useStaticResultSchema(connectorId, operationId);
  return staticResultSchema ? <StaticResult staticResultSchema={staticResultSchema} /> : null;
};

export const testingTab: PanelTab = {
  title: 'Testing',
  name: constants.PANEL_TAB_NAMES.TESTING,
  description: 'Static Testing Tab',
  visible: true,
  content: <TestingPanel />,
  order: 0,
  icon: 'Info',
};
