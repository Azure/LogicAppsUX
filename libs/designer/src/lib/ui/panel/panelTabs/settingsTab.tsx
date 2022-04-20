import { SettingsSection, ReactiveToggle } from '@microsoft/designer-ui';

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
