// Button.stories.ts | Button.stories.tsx
import type { LabelProps } from './index';
import { Label } from './index';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: Label,
  title: 'Components/Label',
} as ComponentMeta<typeof Label>;

export const Standard: ComponentStory<typeof Label> = (args: LabelProps) => <Label {...args} />;

Standard.args = {
  text: 'Label',
  isRequiredField: true,
};
