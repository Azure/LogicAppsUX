// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory, Meta } from '@storybook/react';

import { ActionButtonV2, ActionButtonV2Props } from './index';
import './actionbuttonv2.less';

export default {
  component: ActionButtonV2,
  title: 'Components/ActionButtonV2',
} as ComponentMeta<typeof ActionButtonV2>;

export const Standard: ComponentStory<typeof ActionButtonV2> = (args: ActionButtonV2Props) => <ActionButtonV2 {...args} />;

Standard.args = {
  title: "I'm an action button",
};
