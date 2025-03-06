import constants from '../../../../common/constants';
import { useRetryHistory } from '../../../../core/state/workflow/workflowSelectors';
import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { RetryPanel } from '@microsoft/designer-ui';

export const RetryPanelTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const histories = useRetryHistory(selectedNodeId);
  return histories ? <RetryPanel retryHistories={histories} /> : null;
};

export const monitorRetryTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.RETRY_HISTORY,
  title: intl.formatMessage({
    defaultMessage: 'Retry history',
    id: 'e2b555c96053',
    description: 'The tab label for the retry history tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Retry history',
    id: '3ee15380789d',
    description: 'An accessibility label that describes the retry history tab',
  }),
  visible: true,
  content: <RetryPanelTab {...props} />,
  order: 1,
  icon: 'Rerun',
});
