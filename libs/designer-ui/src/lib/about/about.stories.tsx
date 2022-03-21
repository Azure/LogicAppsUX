import type { AboutProps } from '.';
import { About } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: About,
  title: 'Components/About',
} as ComponentMeta<typeof About>;
export const Standard: ComponentStory<typeof About> = (args: AboutProps) => <About {...args} />;

Standard.args = {
  description: 'blah',
};
