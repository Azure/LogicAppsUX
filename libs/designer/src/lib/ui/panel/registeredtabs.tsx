import constants from '../../common/constants';
import { AboutTab } from './panelTabs/aboutTab';
import type { PanelTab } from './panelUtil';
import * as React from 'react';

export const aboutTab: PanelTab = {
  title: 'About',
  name: constants.PANEL_TAB_NAMES.ABOUT,
  description: 'Request History',
  enabled: true,
  content: <AboutTab />,
  order: 0,
  icon: 'Info',
};
