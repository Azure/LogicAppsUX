import constants from '../../../common/constants';
import type { RootState } from '../../../core/store';
import type { PanelTab } from '@microsoft/designer-ui';
import { Peek } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';

export const CodeViewTab = () => {
  const nodeId = useSelector((state: RootState) => state.panel.selectedNode);
  const nodeMetaData = useSelector<RootState, any>((state) => state.workflow.operations[nodeId] as LogicAppsV2.OperationDefinition);
  return <Peek input={JSON.stringify({ inputs: (nodeMetaData?.inputs as any) ?? {} }, null, 2)} />;
};

export const codeViewTab: PanelTab = {
  title: 'Code View',
  name: constants.PANEL_TAB_NAMES.CODE_VIEW,
  description: 'Code View Tab',
  enabled: true,
  content: <CodeViewTab />,
  order: 1,
  icon: 'Info',
};
