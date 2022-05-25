import constants from '../../../common/constants';
import type { PanelTab } from '@microsoft/designer-ui';
import { ReactiveToggle, SettingsSection } from '@microsoft/designer-ui';

export const SettingsTab = () => {
  const settingSectionProps = {
    id: 'textFieldandToggle',
    title: 'Reactive Toggle',
    expanded: false,
    textFieldValue: '',
    renderContent: ReactiveToggle,
    isInverted: false,
    isReadOnly: false,
  };
  return <SettingsSection {...settingSectionProps} />;
};

export const settingsTab: PanelTab = {
  title: 'Settings',
  name: constants.PANEL_TAB_NAMES.SETTINGS,
  description: 'Request Settings',
  enabled: true,
  content: <SettingsTab />,
  order: 0,
};
