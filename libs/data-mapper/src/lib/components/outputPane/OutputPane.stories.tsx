import type { OutputPaneProps } from './OutputPane';
import { OutputPane } from './OutputPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: OutputPane,
  title: 'Data Mapper Component/Pane/Output Pane',
} as ComponentMeta<typeof OutputPane>;

export const Standard: ComponentStory<typeof OutputPane> = (args: OutputPaneProps) => <OutputPane {...args} />;
Standard.args = {
  isOpen: true,
};
