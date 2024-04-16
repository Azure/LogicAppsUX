import constants from '../../../../common/constants';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useRetryHistory } from '../../../../core/state/workflow/workflowSelectors';
import type { PanelTabFn } from '@microsoft/designer-ui';
import { RetryPanel } from '@microsoft/designer-ui';

export const RetryPanelTab = () => {
  const selectedNodeId = useSelectedNodeId();
  const histories = useRetryHistory(selectedNodeId);
  return histories ? <RetryPanel retryHistories={histories} /> : null;
};

export const monitorRetryTab: PanelTabFn = (intl) => ({
  id: constants.PANEL_TAB_NAMES.RETRY_HISTORY,
  title: intl.formatMessage({
    defaultMessage: 'Retry History',
    id: 'q+ZZjX',
    description: 'The tab label for the retry history tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Retry History',
    id: 'bldzuj',
    description: 'An accessability label that describes the retry history tab',
  }),
  visible: true,
  content: <RetryPanelTab />,
  order: 1,
  icon: 'Rerun',
});
