// Checkbox.stories.js|jsx|ts|tsx
import type { CheckboxProps } from './index';
import { Checkbox } from './index';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: Checkbox,
  title: 'Components/Checkbox',
} as ComponentMeta<typeof Checkbox>;

export const Standard: ComponentStory<typeof Checkbox> = (args: CheckboxProps) => <Checkbox {...args} />;
Standard.args = {
  text: "I'm a checkbox",
  ariaLabel: "I'm a checkbox",
  initialChecked: false,
  descriptionText: 'Description Text',
  disabled: false,
};
