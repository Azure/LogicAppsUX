// workflowparameter.stories.ts | workflowparameter.stories.tsx

import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import WorkflowParameters, { WorkflowParametersProps } from './_workflowparameters';

export default {
  component: WorkflowParameters,
  title: 'Components/WorkflowParameter',
} as ComponentMeta<typeof WorkflowParameters>;
export const Standard: ComponentStory<typeof WorkflowParameters> = (args: WorkflowParametersProps) => (
  <WorkflowParameters {...args} />
);

Standard.args = {
  parameters: [
    {
      id: 'test1', defaultValue: 'true', type: 'Bool', name: 'test'
    },
    {
      id: 'test2', defaultValue: '{}', type: 'Object', name: 'test2', isEditable: false
    }
  ]
};
