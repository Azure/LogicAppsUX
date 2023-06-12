import constants from '../../../common/constants';
import { serializeOperation } from '../../../core/actions/bjsworkflow/serializer';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import type { RootState } from '../../../core/store';
import type { PanelTabFn } from '@microsoft/designer-ui';
import { Peek } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { isNullOrEmpty } from '@microsoft/utils-logic-apps';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

export const CodeViewTab = () => {
  const nodeId = useSelectedNodeId();
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

export const codeViewTab: PanelTabFn = (intl) => ({
  title: intl.formatMessage({ defaultMessage: 'Code View', description: 'The tab label for the code view tab on the operation panel' }),
  name: constants.PANEL_TAB_NAMES.CODE_VIEW,
  description: intl.formatMessage({
    defaultMessage: 'Code View Tab',
    description: 'An accessability label that describes the code view tab',
  }),
  visible: true,
  content: <CodeViewTab />,
  order: 3,
  icon: 'Info',
});
