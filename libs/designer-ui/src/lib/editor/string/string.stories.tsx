import { StringEditor } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: StringEditor,
  title: 'Components/Editor/String',
} as ComponentMeta<typeof StringEditor>;
const Template: ComponentStory<typeof StringEditor> = () => <StringEditor />;

export const standard = Template.bind({});
standard.args = {};
