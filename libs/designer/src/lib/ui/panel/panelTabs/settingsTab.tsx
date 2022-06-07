import constants from '../../../common/constants';
import { SettingsPanel } from '../../settings';
import type { PanelTab } from '@microsoft/designer-ui';

export const SettingsTab: PanelTab = {
  title: 'Settings',
  name: constants.PANEL_TAB_NAMES.SETTINGS,
  description: 'Request Settings',
  enabled: true,
  content: <SettingsPanel />,
  order: 0,
};
