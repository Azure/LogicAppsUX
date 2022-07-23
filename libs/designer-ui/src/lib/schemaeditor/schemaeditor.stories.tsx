import { SchemaEditor } from './';
import type { SchemaEditorProps } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: SchemaEditor,
  title: 'Components/Editor/Monaco/Schema',
} as ComponentMeta<typeof SchemaEditor>;
const Template: ComponentStory<typeof SchemaEditor> = (args: SchemaEditorProps) => <SchemaEditor {...args} />;

export const Standard = Template.bind({});
Standard.args = {
  value: '{\n"test": true,\n"test2" : \n\t{\n\t\t"object" : "value"\n\t}\n}',
  title: 'Request Body JSON Schema',
};
