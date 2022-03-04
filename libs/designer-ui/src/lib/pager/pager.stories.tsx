// Pager.stories.js|jsx|ts|tsx
import type { PagerProps } from './index';
import { Pager } from './index';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: Pager,
  title: 'Components/Pager',
  argTypes: {
    onChange: {
      action: 'onChange',
    },
  },
} as ComponentMeta<typeof Pager>;

const Template: ComponentStory<typeof Pager> = (args: PagerProps) => <Pager {...args} />;

export const Standard = Template.bind({});
Standard.args = {
  current: 1,
  max: 10,
  maxLength: 3,
  min: 1,
  readonlyPagerInput: false,
};

export const WithFailedIterationProps = Template.bind({});
WithFailedIterationProps.args = {
  current: 1,
  max: 10,
  maxLength: 3,
  min: 1,
  readonlyPagerInput: false,
  failedIterationProps: {
    max: 6,
    min: 3,
  },
};
