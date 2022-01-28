// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Checkbox, CheckboxProps } from './index';

export default {
  component: Checkbox,
  title: 'Components/Checkbox',
  parameters: { text: 'Hello' },
} as ComponentMeta<typeof Checkbox>;

export const Standard: ComponentStory<typeof Checkbox> = (args: CheckboxProps) => <Checkbox {...args} />;
Standard.args = {
  text: "I'm a checkbox",
  ariaLabel: "I'm a checkbox",
  initChecked: false,
  descriptionText: 'Description Text',
  disabled: false,
  //id: 'test-id-checkbox',
};
