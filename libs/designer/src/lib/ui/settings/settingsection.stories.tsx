import type { SettingSectionProps } from './settingsection';
import { SettingsSection } from './settingsection';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: SettingsSection,
  title: 'Components/Settings',
} as ComponentMeta<typeof SettingsSection>;
const Template: ComponentStory<typeof SettingsSection> = (args: SettingSectionProps) => <SettingsSection {...args} />;

export const settingSection = Template.bind({});
settingSection.args = {
  id: 'this is an ID',
  title: 'Sample Setting Section',
  expanded: false,
  settings: [
    {
      settingType: 'MultiSelectSetting',
      settingProp: {
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
      },
      visible: true,
    },
    {
      settingType: 'SettingTextField',
      settingProp: {
        label: 'test label',
        value: 'test value',
      },
      visible: true,
    },
    {
      settingType: 'ReactiveToggle',
      settingProp: {
        textFieldValue: 'This is a test value',
        textFieldLabel: 'Test Label',
        onToggleLabel: 'On',
        offToggleLabel: 'Off',
      },
      visible: true,
    },
    {
      settingType: 'MultiAddExpressionEditor',
      settingProp: { onExpressionsChange: () => console.log('function not implemented') },
      visible: true,
    },
    {
      settingType: 'CustomValueSlider',
      settingProp: { minVal: 10, maxVal: 300, value: 200, sliderLabel: 'Slider', onValueChange: () => null },
      visible: true,
    },
    {
      settingType: 'MultiSelectSetting',
      settingProp: {
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
      },
      visible: true,
    },
  ],
};
