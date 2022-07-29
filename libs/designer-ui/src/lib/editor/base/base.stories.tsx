import { ValueSegmentType } from '../models/parameter';
import { CollapsedEditorType } from '../shared/collapsedEditor';
// Tokens commented out until Tokens enabled in storybook
// import { testTokenSegment } from '../shared/testtokensegment';
import type { BaseEditorProps } from './';
import { BaseEditor } from './';
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
    { type: ValueSegmentType.LITERAL, value: 'test\ntest' },
    { type: ValueSegmentType.LITERAL, value: 'test\ntest' },
    // testTokenSegment,
  ],
};

export const token = Template.bind({});
token.args = {
  className: 'msla-editor-container',
  placeholder: 'Play around with tokenizing',
  BasePlugins: { tokens: true },
};

export const validation = Template.bind({});
validation.args = {
  className: 'msla-editor-container',
  placeholder: 'Please enter a valid Array',
  BasePlugins: {
    validation: {
      type: CollapsedEditorType.COLLAPSED_ARRAY,
      errorMessage: 'Please enter a valid array - (storybook will always be invalid)',
      isValid: false,
    },
  },
  initialValue: [
    { type: ValueSegmentType.LITERAL, value: 'test\ntest' },
    { type: ValueSegmentType.LITERAL, value: 'test\ntest' },
  ],
};
