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
  className: 'msla-string-editor-container-plugin',
  placeholder: 'Play around with some cool plugins here...',
  BasePlugins: { autoFocus: true, autoLink: true, clearEditor: true, history: true, treeView: true },
};
