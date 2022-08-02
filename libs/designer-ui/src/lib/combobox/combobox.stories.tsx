import type { ValueSegment } from '../editor';
import { Combobox } from './';
import type { ComboboxProps } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: Combobox,
  title: 'Components/Editor/Combobox',
} as ComponentMeta<typeof Combobox>;
const Template: ComponentStory<typeof Combobox> = (args: ComboboxProps) => <Combobox {...args} />;

export const Standard = Template.bind({});

Standard.args = {
  options: [
    { value: 'GET', key: 'GET', displayName: 'GET', disabled: false },
    { value: 'PUT', key: 'PUT', displayName: 'PUT', disabled: false },
    { value: 'POST', key: 'POST', displayName: 'POST', disabled: false },
    { value: 'PATCH', key: 'PATCH', displayName: 'PATCH', disabled: false },
    { value: 'DELETE', key: 'DELETE', displayName: 'DELETE', disabled: false },
  ],
  placeholderText: 'Method is Required',
  label: 'Method',
  selectedKey: 'PUT',
  setSelectedKey: (key: string) => {
    console.log(key);
  },
  setCustomValue: (key: ValueSegment[] | null) => {
    console.log(key);
  },
};
