import constants from '../../../common/constants';
import { serializeOperation } from '../../../core/actions/bjsworkflow/serializer';
import type { RootState } from '../../../core/store';
import { isNullOrEmpty } from '@microsoft-logic-apps/utils';
import type { PanelTab } from '@microsoft/designer-ui';
import { Peek } from '@microsoft/designer-ui';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

export const CodeViewTab = () => {
  const nodeId = useSelector((state: RootState) => state.panel.selectedNode);
  const nodeMetaData = useSelector<RootState, any>((state) => state.workflow.operations[nodeId] as LogicAppsV2.OperationDefinition);
  const rootState = useSelector((state: RootState) => state);
  const queryData = useQuery(['serialization', { nodeId }], () => serializeOperation(rootState, nodeId), {
    retry: false,
    cacheTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const content = queryData.isLoading
    ? 'Loading ...'
    : JSON.stringify(isNullOrEmpty(queryData.data) ? { inputs: (nodeMetaData?.inputs as any) ?? {} } : queryData.data, null, 2);

  return <Peek input={content} />;
};

export const codeViewTab: PanelTab = {
  title: 'Code View',
  name: constants.PANEL_TAB_NAMES.CODE_VIEW,
  description: 'Code View Tab',
  visible: true,
  content: <CodeViewTab />,
  order: 1,
  icon: 'Info',
};
