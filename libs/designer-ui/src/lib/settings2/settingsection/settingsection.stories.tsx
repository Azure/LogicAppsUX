import { ComponentMeta, ComponentStory } from '@storybook/react';

import { SettingSectionComponentProps } from '.';
import { ReactiveToggle } from './settingreactiveinput';
import { SettingTextField } from './settingtextfield';
import { RenderToggleSetting } from './settingtoggle';
import { SettingsSection } from '../';

export default {
  component: SettingsSection,
  title: 'Components/Settings',
} as ComponentMeta<typeof SettingsSection>;
const Template: ComponentStory<typeof SettingsSection> = (args: SettingSectionComponentProps) => <SettingsSection {...args} />;

export const toggleSetting = Template.bind({});
toggleSetting.args = {
  id: 'toggleable',
  title: 'Sample Setting',
  expanded: false,
  renderContent: RenderToggleSetting,
};

export const textField = Template.bind({});
textField.args = {
  id: 'textField',
  title: 'Text Field',
  expanded: false,
  textFieldValue: '',
  renderContent: SettingTextField,
};

export const reactiveToggleWithText = Template.bind({});
reactiveToggleWithText.args = {
  id: 'textFieldandToggle',
  title: 'Reactive Toggle',
  expanded: false,
  textFieldValue: '',
  renderContent: ReactiveToggle,
};
