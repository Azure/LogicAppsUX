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
  className: 'msla-editor-container',
  placeholder: 'Enter Text Here...',
};

export const singleLine = Template.bind({});
singleLine.args = {
  className: 'msla-editor-container',
  placeholder: 'Enter Text Here...',
  singleLine: true,
};
