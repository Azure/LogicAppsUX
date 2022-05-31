import type { SettingSectionComponentProps } from '..';
import { SettingsSection } from '..';
import { MultiAddExpressionEditor } from './settingexpressioneditor';
import { MultiSelectSetting } from './settingmultiselect';
import type { MultiSelectSettingProps } from './settingmultiselect';
import { ReactiveToggle } from './settingreactiveinput';
import { CustomValueSlider } from './settingslider';
import { SettingTextField } from './settingtextfield';
import { RenderToggleSetting } from './settingtoggle';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

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

export const addMultipleConditions = Template.bind({});
addMultipleConditions.args = {
  id: 'addOrDeleteConditions',
  title: 'Multi-Add Expression Settings',
  expanded: false,
  renderContent: MultiAddExpressionEditor,
};

export const sliderSetting = Template.bind({});
sliderSetting.args = {
  id: 'sliderSetting',
  title: 'Setting Slider',
  expanded: false,
  renderContent: CustomValueSlider,
};

export const multiSelectSetting = Template.bind({});
const sampleProps: MultiSelectSettingProps = {
  options: [
    {
      label: 'Label 1',
      value: 'Label 1 Value',
    },
    {
      label: 'Label 2',
      value: 'Label 2 Value',
    },
    {
      label: 'Label 3',
      value: 'Label 3 Value',
    },
    {
      label: 'Label 4',
      value: 'Label 4 Value',
    },
  ],
  selections: [],
};
multiSelectSetting.args = {
  id: 'multiSelectSetting',
  title: 'Multi-Select Item Setting',
  expanded: false,
  renderContent: () => <MultiSelectSetting {...sampleProps} />,
};
