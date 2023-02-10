import { store } from '../../core/state/Store';
import { ifPseudoFunction } from '../../models';
import type { InputDropdownProps } from './InputDropdown';
import { InputDropdown } from './InputDropdown';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: InputDropdown,
  title: 'Data Mapper Components/Input Dropdown',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof InputDropdown>;

export const Standard: ComponentStory<typeof InputDropdown> = (args: InputDropdownProps) => <InputDropdown {...args} />;

Standard.args = {
  inputIndex: 0,
  currentNode: ifPseudoFunction,
  label: ifPseudoFunction.inputs[0].name,
  placeholder: ifPseudoFunction.inputs[0].placeHolder,
  inputAllowsCustomValues: true,
  isUnboundedInput: false,
};
