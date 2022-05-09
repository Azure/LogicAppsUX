import constants from '../../common/constants';
import { AboutTab } from './panelTabs/aboutTab';
import { CodeViewTab } from './panelTabs/codeViewTab';
import { RequestPanelTab } from './panelTabs/requestTab';
import { RetryPanelTab } from './panelTabs/retryTab';
import { SettingsTab } from './panelTabs/settingsTab';
import type { PanelTab } from './panelUtil';
import * as React from 'react';

export const monitorRetryTab: PanelTab = {
  title: 'Retry',
  name: constants.PANEL_TAB_NAMES.RETRY_HISTORY,
  description: 'Retry History',
  enabled: true,
  content: <RetryPanelTab />,
  order: 0,
  icon: 'Rerun',
};

export const monitorRequestTab: PanelTab = {
  title: 'Request',
  name: constants.PANEL_TAB_NAMES.REQUEST_HISTORY,
  description: 'Request History',
  enabled: true,
  content: <RequestPanelTab />,
  order: 0,
  icon: 'Rerun',
};

export const aboutTab: PanelTab = {
  title: 'About',
  name: constants.PANEL_TAB_NAMES.ABOUT,
  description: 'Request History',
  enabled: true,
  content: <AboutTab />,
  order: 0,
  icon: 'Info',
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

export const settingsTab: PanelTab = {
  title: 'Settings',
  name: constants.PANEL_TAB_NAMES.SETTINGS,
  description: 'Request Settings',
  enabled: true,
  content: <SettingsTab />,
  order: 0,
};
