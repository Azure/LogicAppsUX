import type { StringEditorProps } from './';
import { StringEditor } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: StringEditor,
  title: 'Components/Editor/String',
} as ComponentMeta<typeof StringEditor>;
const Template: ComponentStory<typeof StringEditor> = (args: StringEditorProps) => <StringEditor {...args} />;

export const standard = Template.bind({});
standard.args = {
  placeholder: 'Enter Text Here...',
};

export const singleLine = Template.bind({});
singleLine.args = {
  placeholder: 'Enter Text Here...',
  singleLine: true,
};

export const plugins = Template.bind({});
plugins.args = {
  placeholder: 'Play around with some cool plugins here...',
  pluginsEnabled: true,
  hasClear: true,
};
