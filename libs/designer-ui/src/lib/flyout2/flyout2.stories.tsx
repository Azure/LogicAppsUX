// flyout2.stories.js|jsx|ts|tsx
import type { Flyout2Props } from './index';
import { Flyout2 } from './index';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: Flyout2,
  title: 'Components/Flyout2',
} as ComponentMeta<typeof Flyout2>;

export const Standard: ComponentStory<typeof Flyout2> = (args: Flyout2Props) => <Flyout2 {...args} />;
Standard.args = {
  flyoutExpanded: false,
  text: 'Details can be found at http://aka.ms/logicapps-chunk.',
};
