import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { PanelRoot, PanelRootProps } from './panelroot';
import { WorkflowParameters } from '../workflowparameters/workflowparameters';

export default {
  component: PanelRoot,
  title: 'Components/Panel',
} as ComponentMeta<typeof PanelRoot>;
export const Standard: ComponentStory<typeof PanelRoot> = (args: PanelRootProps) => <PanelRoot {...args} />;

Standard.args = {};
