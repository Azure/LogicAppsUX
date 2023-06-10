import constants from '../../../common/constants';
import { useSelectedNodeId } from '../../../core';
import { useRetryHistory } from '../../../core/state/workflow/workflowSelectors';
import type { PanelTab } from '@microsoft/designer-ui';
import { RetryPanel } from '@microsoft/designer-ui';

export const RetryPanelTab = () => {
  const selectedNodeId = useSelectedNodeId();
  const histories = useRetryHistory(selectedNodeId);
  return histories ? <RetryPanel retryHistories={histories} /> : null;
};

export const monitorRetryTab: PanelTab = {
  title: 'Retry History',
  name: constants.PANEL_TAB_NAMES.RETRY_HISTORY,
  description: 'Retry History',
  visible: true,
  content: <RetryPanelTab />,
  order: 1,
  icon: 'Rerun',
};
