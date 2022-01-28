// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { CopyInputControl, CopyInputControlProps } from './index';

export default {
  component: CopyInputControl,
  title: 'Components/CopyInputControl',
} as ComponentMeta<typeof CopyInputControl>;

export const Standard: ComponentStory<typeof CopyInputControl> = (args: CopyInputControlProps) => <CopyInputControl {...args} />;
Standard.args = {
  placeholderText: 'Copy',
  text: 'ieonrowinerwner',
};
