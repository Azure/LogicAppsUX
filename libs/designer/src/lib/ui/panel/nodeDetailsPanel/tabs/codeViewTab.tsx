import constants from '../../../../common/constants';
import { serializeOperation } from '../../../../core/actions/bjsworkflow/serializer';
import { useActionMetadata } from '../../../../core/state/workflow/workflowSelectors';
import type { RootState } from '../../../../core/store';
import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { Peek } from '@microsoft/designer-ui';
import { isNullOrEmpty } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

export const CodeViewTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId } = props;
  const nodeMetaData = useActionMetadata(nodeId) as any;
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
    : JSON.stringify(isNullOrEmpty(queryData.data) ? { inputs: nodeMetaData?.inputs ?? {} } : queryData.data, null, 2);

  return <Peek input={content} />;
};

export const codeViewTab: PanelTabFn = (intl, nodeId) => ({
  id: constants.PANEL_TAB_NAMES.CODE_VIEW,
  title: intl.formatMessage({
    defaultMessage: 'Code View',
    id: 'IPbMdl',
    description: 'The tab label for the code view tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Code View Tab',
    id: 'ifnOUI',
    description: 'An accessability label that describes the code view tab',
  }),
  visible: true,
  content: <CodeViewTab nodeId={nodeId} />,
  order: 3,
  icon: 'Info',
});
