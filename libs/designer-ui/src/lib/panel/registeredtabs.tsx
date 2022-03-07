import * as React from 'react';
import constants from '../constants';
import { RetryPanelTab } from './panelTabs/retryTab';
import { PanelTab } from './panelUtil';

export const retryTab: PanelTab = {
  title: 'Retry History',
  name: constants.PANEL.PANEL_TAB_NAMES.RETRY_HISTORY,
  description: 'Retry History',
  enabled: true,
  content: <RetryPanelTab />,
  order: 0,
  icon: 'EditStyle',
};
