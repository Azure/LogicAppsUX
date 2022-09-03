import { ValueSegmentType } from '../models/parameter';
// Tokens commented out until Tokens enabled in storybook
// import { testTokenSegment } from '../shared/testtokensegment';
import type { BaseEditorProps } from './';
import { BaseEditor } from './';
import { guid } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: BaseEditor,
  title: 'Components/Editor/Base',
} as ComponentMeta<typeof BaseEditor>;
const Template: ComponentStory<typeof BaseEditor> = (args: BaseEditorProps) => <BaseEditor {...args} />;

export const plugins = Template.bind({});
plugins.args = {
  className: 'msla-editor-container-plugin',
  placeholder: 'Play around with some cool plugins here...',
  BasePlugins: {
    autoFocus: true,
    autoLink: true,
    clearEditor: true,
    treeView: true,
    tokens: true,
  },
  initialValue: [
    { id: guid(), type: ValueSegmentType.LITERAL, value: 'test\ntest' },
    { id: guid(), type: ValueSegmentType.LITERAL, value: 'test\ntest' },
  ],
};

export const token = Template.bind({});
token.args = {
  className: 'msla-editor-container',
  placeholder: 'Play around with tokenizing',
  BasePlugins: { tokens: true },
};
