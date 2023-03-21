import constants from '../../../common/constants';
import { SettingsPanel } from '../../settings/';
import type { PanelTab } from '@microsoft/designer-ui';

export const settingsTab: PanelTab = {
  title: 'Settings',
  name: constants.PANEL_TAB_NAMES.SETTINGS,
  description: 'Request Settings',
  visible: true,
  content: <SettingsPanel />,
  order: 0,
};
