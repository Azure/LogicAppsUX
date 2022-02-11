// copyinputcontrol.stories.js|jsx|ts|tsx

import { ComponentMeta, ComponentStory } from '@storybook/react';
import { CopyInputControl, CopyInputControlProps } from './index';

export default {
  component: CopyInputControl,
  title: 'Components/CopyInputControl',
} as ComponentMeta<typeof CopyInputControl>;

export const Standard: ComponentStory<typeof CopyInputControl> = (args: CopyInputControlProps) => <CopyInputControl {...args} />;

Standard.args = {
  placeholder: 'Copy',
  text: 'ieonrowinerwner',
};
