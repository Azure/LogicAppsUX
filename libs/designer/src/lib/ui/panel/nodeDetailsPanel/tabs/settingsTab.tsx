import constants from '../../../../common/constants';
import { SettingsPanel } from '../../../settings/';
import type { PanelTabFn } from '@microsoft/designer-ui';

export const settingsTab: PanelTabFn = (intl, nodeId) => ({
  id: constants.PANEL_TAB_NAMES.SETTINGS,
  title: intl.formatMessage({
    defaultMessage: 'Settings',
    id: 'oMphsh',
    description: 'The tab label for the settings tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Request Settings',
    id: 'vdKLiR',
    description: 'An accessability label that describes the settings tab',
  }),
  visible: true,
  content: <SettingsPanel nodeId={nodeId} />,
  order: 2,
});
