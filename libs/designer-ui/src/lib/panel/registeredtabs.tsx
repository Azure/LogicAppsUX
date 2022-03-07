import constants from '../constants';
import { RequestPanelTab } from './panelTabs/requestTab';
import { RetryPanelTab } from './panelTabs/retryTab';
import type { PanelTab } from './panelUtil';
import * as React from 'react';

export const retryTab: PanelTab = {
  title: 'Retry',
  name: constants.PANEL.PANEL_TAB_NAMES.RETRY_HISTORY,
  description: 'Retry History',
  enabled: true,
  content: <RetryPanelTab />,
  order: 0,
  icon: 'EditStyle',
};

export const requestTab: PanelTab = {
  title: 'Request',
  name: constants.PANEL.PANEL_TAB_NAMES.REQUEST_HISTORY,
  description: 'Request History',
  enabled: true,
  content: <RequestPanelTab />,
  order: 0,
  icon: 'EditStyle',
};
