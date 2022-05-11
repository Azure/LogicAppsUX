import type { SettingSectionComponentProps } from '..';
import { SettingsSection } from '..';
import { ConfigurableMultiSelectItemSection } from './configurableactionitemsetting';
import type { ConfigurableMultiSelectItemSectionProps } from './configurableactionitemsetting';
import { MultiAddExpressionEditor } from './settingexpressioneditor';
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

export const configurableActionItemSetting = Template.bind({});
const sampleProps: ConfigurableMultiSelectItemSectionProps = {
  configurableActionItems: [],
  configuredActionItems: [
    {
      id: 'sampleActionId',
      title: 'Sample Action',
      statuses: {
        'Option 1': true,
        'Option 2': false,
        'Option 3': false,
        'Option 4': false,
      },
    },
    {
      id: 'sampleActionId2',
      title: 'Sample Action',
      statuses: {
        'Option 1': true,
        'Option 2': false,
        'Option 3': false,
        'Option 4': false,
      },
    },
  ],
  isReadOnly: false,
};
configurableActionItemSetting.args = {
  id: 'multiSelectSetting',
  title: 'Configurable Multi-Select Item Setting',
  expanded: false,
  renderContent: () => <ConfigurableMultiSelectItemSection {...sampleProps} />,
};
