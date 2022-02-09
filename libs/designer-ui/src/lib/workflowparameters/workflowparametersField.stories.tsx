import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { WorkflowparameterField, WorkflowparameterFieldProps } from './workflowparametersField';

export default {
  component: WorkflowparameterField,
  title: 'Components/WorkflowParameter2',
} as ComponentMeta<typeof WorkflowparameterField>;
export const Standard: ComponentStory<typeof WorkflowparameterField> = (args: WorkflowparameterFieldProps) => (
  <WorkflowparameterField {...args} />
);

Standard.args = {
  isEditable: true,
  name: 'id',
  definition: { id: 'id', defaultValue: 'defaultValue', name: 'name', type: 'Array', value: 'testing' },
};
