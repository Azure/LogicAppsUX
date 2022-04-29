import type { HelloWorldProps } from './';
import { HelloWorld } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: HelloWorld,
  title: 'Data Mapper/Hello World',
} as ComponentMeta<typeof HelloWorld>;
export const Standard: ComponentStory<typeof HelloWorld> = (args: HelloWorldProps) => <HelloWorld {...args} />;

Standard.args = {
  name: 'Storybook',
};
