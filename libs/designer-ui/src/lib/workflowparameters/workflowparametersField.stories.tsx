import { ComponentMeta, ComponentStory } from '@storybook/react';
import { WorkflowparameterField, WorkflowparameterFieldProps } from './workflowparametersField';

export default {
  component: WorkflowparameterField,
  title: 'Components/WorkflowParameter',
} as ComponentMeta<typeof WorkflowparameterField>;
export const Field: ComponentStory<typeof WorkflowparameterField> = (args: WorkflowparameterFieldProps) => (
  <WorkflowparameterField {...args} />
);

Field.args = {
  isEditable: true,
  name: 'id',
  definition: { id: 'id', defaultValue: 'defaultValue', name: 'name', type: 'Array', value: 'testing' },
};
