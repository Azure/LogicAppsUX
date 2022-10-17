import type { InputDropdownProps } from './InputDropdown';
import { InputDropdown } from './InputDropdown';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: InputDropdown,
  title: 'Data Mapper Components/Input Dropdown',
} as ComponentMeta<typeof InputDropdown>;

export const Standard: ComponentStory<typeof InputDropdown> = (args: InputDropdownProps) => <InputDropdown {...args} />;
