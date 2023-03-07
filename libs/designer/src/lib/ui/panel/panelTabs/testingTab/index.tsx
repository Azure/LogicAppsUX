import constants from '../../../../common/constants';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useNodeMetadata } from '../../../../core/state/workflow/workflowSelectors';
import type { PanelTab } from '@microsoft/designer-ui';

export const TestingPanel: React.FC = () => {
  const selectedNodeId = useSelectedNodeId();
  const nodeMetadata = useNodeMetadata(selectedNodeId);

  return <div>{nodeMetadata?.graphId}</div>;
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
