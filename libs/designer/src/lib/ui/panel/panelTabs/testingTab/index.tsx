import constants from '../../../../common/constants';
import { useParameterStaticResult } from '../../../../core/state/operation/operationSelector';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useOperationInfo } from '../../../../core/state/selectors/actionMetadataSelector';
import { useStaticResultSchema } from '../../../../core/state/staticresultschema/staitcresultsSelector';
import { getNextStaticResultName } from '../../../../core/utils/staticResults';
import type { PanelTab } from '@microsoft/designer-ui';
import { StaticResult } from '@microsoft/designer-ui';

export const TestingPanel: React.FC = () => {
  const selectedNode = useSelectedNodeId();
  const operationInfo = useOperationInfo(selectedNode);
  const { connectorId, operationId } = operationInfo;
  const staticResultSchema = useStaticResultSchema(connectorId, operationId);
  const parameterStaticResult = useParameterStaticResult(selectedNode) ?? {};

  const { name = getNextStaticResultName(operationId), staticResultOptions = false } = parameterStaticResult;
  console.log(name);
  return staticResultSchema ? <StaticResult staticResultSchema={staticResultSchema} isRoot={true} enabled={!staticResultOptions} /> : null;
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
