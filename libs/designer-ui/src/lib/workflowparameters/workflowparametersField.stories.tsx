import type { WorkflowparameterFieldProps } from './workflowparametersField';
import { WorkflowparameterField } from './workflowparametersField';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

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
  definition: { id: 'id', value: 'defaultValue', name: 'name', type: 'Array' },
};
