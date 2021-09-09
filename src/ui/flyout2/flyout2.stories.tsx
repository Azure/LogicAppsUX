// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory, Meta } from '@storybook/react';

import { Flyout2, Flyout2Props } from './index';

export default {
  component: Flyout2,
  title: 'Components/Flyout2',
} as ComponentMeta<typeof Flyout2>;

export const Standard: ComponentStory<typeof Flyout2> = (args: Flyout2Props) => <Flyout2 {...args} />;
Standard.args = {
  flyoutExpanded: true,
  text: 'Details can be found at http://aka.ms/logicapps-chunk.',
};
