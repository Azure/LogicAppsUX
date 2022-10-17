import { CodeView } from './CodeView';
import type { CodeViewProps } from './CodeView';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: CodeView,
  title: 'Data Mapper Components/Pane/CodeView',
} as ComponentMeta<typeof CodeView>;

export const Standard: ComponentStory<typeof CodeView> = (args: CodeViewProps) => <CodeView {...args} />;
Standard.args = {
  dataMapDefinition: 'Placeholder: YAML',
  isCodeViewOpen: true,
};
