import constants from '../../../../common/constants';
import { SettingsPanel } from '../../../settings/';
import type { PanelTabFn } from '@microsoft/designer-ui';

export const settingsTab: PanelTabFn = (intl) => ({
  title: intl.formatMessage({ defaultMessage: 'Settings', description: 'The tab label for the settings tab on the operation panel' }),
  name: constants.PANEL_TAB_NAMES.SETTINGS,
  description: intl.formatMessage({
    defaultMessage: 'Request Settings',
    description: 'An accessability label that describes the settings tab',
  }),
  visible: true,
  content: <SettingsPanel />,
  order: 2,
});
