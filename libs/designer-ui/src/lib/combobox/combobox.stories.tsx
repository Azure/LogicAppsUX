import type { Segment } from '../editor/base';
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
    { value: 'GET', key: 'GET', disabled: false },
    { value: 'PUT', key: 'PUT', disabled: false },
    { value: 'POST', key: 'POST', disabled: false },
    { value: 'PATCH', key: 'PATCH', disabled: false },
    { value: 'DELETE', key: 'DELETE', disabled: false },
  ],
  placeholderText: 'Method is Required',
  label: 'Method',
  selectedKey: 'PUT',
  setSelectedKey: (key: string) => {
    console.log(key);
  },
  setCustomValue: (key: Segment[] | null) => {
    console.log(key);
  },
};
