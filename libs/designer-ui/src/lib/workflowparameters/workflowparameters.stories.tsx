import { ComponentMeta, ComponentStory } from '@storybook/react';
import { WorkflowParameters, WorkflowParametersProps } from './workflowparameters';

export default {
  component: WorkflowParameters,
  title: 'Components/WorkflowParameter',
} as ComponentMeta<typeof WorkflowParameters>;
export const Standard: ComponentStory<typeof WorkflowParameters> = (args: WorkflowParametersProps) => <WorkflowParameters {...args} />;

Standard.args = {
  parameters: [
    {
      id: 'first',
      defaultValue: 'true',
      type: 'Bool',
      name: 'ParameterOne',
      isEditable: true,
    },
    {
      id: 'second',
      defaultValue: '{}',
      type: 'Object',
      name: 'ParameterTwo',
      isEditable: false,
    },
  ],
};
