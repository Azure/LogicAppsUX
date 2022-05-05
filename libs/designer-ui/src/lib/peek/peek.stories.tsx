import { Peek } from './';
import type { PeekProps } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: Peek,
  title: 'Components/Peek',
} as ComponentMeta<typeof Peek>;
const Template: ComponentStory<typeof Peek> = (args: PeekProps) => <Peek {...args} />;

export const JSON = Template.bind({});
JSON.args = {
  input: '{\n"test": true,\n"test2" : \n\t{\n\t\t"object" : "value"\n\t}\n}',
};
