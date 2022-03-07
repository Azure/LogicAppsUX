// Button.stories.ts | Button.stories.tsx
import type { ActionButtonV2Props } from './index';
import { ActionButtonV2 } from './index';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ActionButtonV2,
  title: 'Components/ActionButtonV2',
} as ComponentMeta<typeof ActionButtonV2>;

export const Standard: ComponentStory<typeof ActionButtonV2> = (args: ActionButtonV2Props) => <ActionButtonV2 {...args} />;

Standard.args = {
  title: "I'm an action button",
};
