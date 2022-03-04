// copyinputcontrol.stories.js|jsx|ts|tsx
import type { CopyInputControlProps } from './index';
import { CopyInputControl } from './index';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CopyInputControl,
  title: 'Components/CopyInputControl',
} as ComponentMeta<typeof CopyInputControl>;

export const Standard: ComponentStory<typeof CopyInputControl> = (args: CopyInputControlProps) => <CopyInputControl {...args} />;

Standard.args = {
  placeholder: 'Copy',
  text: 'ieonrowinerwner',
};
