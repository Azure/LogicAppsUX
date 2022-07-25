import { Peek } from './';
import type { PeekProps } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: Peek,
  title: 'Components/Editor/Monaco/Peek',
} as ComponentMeta<typeof Peek>;
const Template: ComponentStory<typeof Peek> = (args: PeekProps) => <Peek {...args} />;

export const Standard = Template.bind({});
// https://github.com/microsoft/monaco-editor/issues/2448
Standard.parameters = {
  axe: {
    disabledRules: ['landmark-unique'],
  },
};

Standard.args = {
  input: '{\n"test": true,\n"test2" : \n\t{\n\t\t"object" : "value"\n\t}\n}',
};
