import { CustomEditor, EditorLanguage } from './';
import type { MonacoProps } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CustomEditor,
  title: 'Components/Editor/Monaco',
} as ComponentMeta<typeof CustomEditor>;
const Template: ComponentStory<typeof CustomEditor> = (args: MonacoProps) => <CustomEditor {...args} />;

export const templateExpressionLanguage = Template.bind({});
templateExpressionLanguage.args = {
  language: EditorLanguage.templateExpressionLanguage,
  value: "true false\naddMinutes()\n12345\n'string'",
};

// https://github.com/microsoft/monaco-editor/issues/2448
templateExpressionLanguage.parameters = {
  axe: {
    disabledRules: ['landmark-unique'],
  },
};

export const javascript = Template.bind({});
javascript.args = {
  language: EditorLanguage.javascript,
  value: "// First line\nfunction hello() {\n\talert('Hello world!');\n}\n// Last line",
};
javascript.parameters = {
  axe: {
    disabledRules: ['landmark-unique'],
  },
};

export const JSON = Template.bind({});
JSON.args = {
  language: EditorLanguage.json,
  value: '{\n"test": true,\n"test2" : \n\t{\n\t\t"object" : "value"\n\t}\n}',
};

JSON.parameters = {
  axe: {
    disabledRules: ['landmark-unique'],
  },
};

export const XML = Template.bind({});
XML.args = {
  language: EditorLanguage.xml,
  value: "<note> \n\t<to>\n\t\t<from>\n\t\t\t<body> Don't Forget To Bring the Shampoo </body>\n\t\t</from>\n\t</to>\n</note>",
};

XML.parameters = {
  axe: {
    disabledRules: ['landmark-unique'],
  },
};
