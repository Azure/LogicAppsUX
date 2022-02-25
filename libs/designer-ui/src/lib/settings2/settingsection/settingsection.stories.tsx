import { ComponentMeta, ComponentStory } from '@storybook/react';
import { SettingSectionComponentProps } from '.';
import { SettingsSection } from '../';
import { ReactiveToggle } from './settingcombo';
import { renderTextFieldSetting } from './settingfield';
import { renderToggleSetting } from './settingtoggle';

export default {
  component: SettingsSection,
  title: 'Components/Settings',
} as ComponentMeta<typeof SettingsSection>;
const Template: ComponentStory<typeof SettingsSection> = (args: SettingSectionComponentProps) => <SettingsSection {...args} />;

export const toggleSetting = Template.bind({});
toggleSetting.args = {
  id: 'toggleable',
  title: 'Sample Setting',
  renderContent: renderToggleSetting,
};

export const textField = Template.bind({});
textField.args = {
  id: 'textField',
  title: 'Text Field',
  textFieldValue: '',
  renderContent: renderTextFieldSetting,
};

export const reactiveToggleWithText = Template.bind({});
reactiveToggleWithText.args = {
  id: 'textField',
  title: 'Reactive Toggle',
  textFieldValue: '',
  renderContent: ReactiveToggle,
};
