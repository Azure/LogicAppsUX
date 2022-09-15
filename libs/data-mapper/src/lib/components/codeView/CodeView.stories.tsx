import { CodeView, type CodeViewProps } from './CodeView';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: CodeView,
  title: 'Data Mapper/CodeView',
} as ComponentMeta<typeof CodeView>;

export const Standard: ComponentStory<typeof CodeView> = (args: CodeViewProps) => <CodeView {...args} />;
Standard.args = {
  dataMapDefYaml: 'Placeholder: YAML',
  isCodeViewOpen: true,
};
