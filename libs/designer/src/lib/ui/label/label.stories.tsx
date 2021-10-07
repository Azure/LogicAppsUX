// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Label, LabelProps } from './index';

export default {
  component: Label,
  title: 'Components/Label',
} as ComponentMeta<typeof Label>;

export const Standard: ComponentStory<typeof Label> = (args: LabelProps) => <Label {...args} />;

Standard.args = {
  text: 'Label',
  isRequiredField: true,
};
