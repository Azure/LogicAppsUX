import type { WorkflowParametersProps } from './workflowparameters';
import { WorkflowParameters } from './workflowparameters';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: WorkflowParameters,
  title: 'Components/WorkflowParameter',
} as ComponentMeta<typeof WorkflowParameters>;
export const Standard: ComponentStory<typeof WorkflowParameters> = (args: WorkflowParametersProps) => <WorkflowParameters {...args} />;

Standard.args = {
  parameters: [
    {
      id: 'first',
      value: 'true',
      type: 'Bool',
      name: 'ParameterOne',
      isEditable: true,
    },
    {
      id: 'second',
      value: '{}',
      type: 'Object',
      name: 'ParameterTwo',
      isEditable: false,
    },
  ],
};
