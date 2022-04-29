import { CustomEditor, EditorLanguage } from './';
import type { EditorProps } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CustomEditor,
  title: 'Components/Editor',
} as ComponentMeta<typeof CustomEditor>;
export const Standard: ComponentStory<typeof CustomEditor> = (args: EditorProps) => <CustomEditor {...args} />;

Standard.args = {
  language: EditorLanguage.templateExpressionLanguage,
  value: "// First line\nfunction hello() {\n\talert('Hello world!');\n}\n// Last line",
};
