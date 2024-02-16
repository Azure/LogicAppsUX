import constants from '../../../../common/constants';
import { SettingsPanel } from '../../../settings/';
import type { PanelTabFn } from '@microsoft/logic-apps-shared';

export const settingsTab: PanelTabFn = (intl) => ({
  id: constants.PANEL_TAB_NAMES.SETTINGS,
  title: intl.formatMessage({ defaultMessage: 'Settings', description: 'The tab label for the settings tab on the operation panel' }),
  description: intl.formatMessage({
    defaultMessage: 'Request Settings',
    description: 'An accessability label that describes the settings tab',
  }),
  visible: true,
  content: <SettingsPanel />,
  order: 2,
});
