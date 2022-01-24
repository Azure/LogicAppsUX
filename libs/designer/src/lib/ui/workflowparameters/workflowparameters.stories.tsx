// workflowparameter.stories.ts | workflowparameter.stories.tsx

import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
// import { WorkflowParameterView, WorkflowParameterViewProps } from './';
import { WorkflowParameter, WorkflowParameterProps } from './_workflowparameter';

export default {
  component: WorkflowParameter,
  title: 'Components/WorkflowParameter',
} as ComponentMeta<typeof WorkflowParameter>;
export const Standard: ComponentStory<typeof WorkflowParameter> = (args: WorkflowParameterProps) => (
  <WorkflowParameter {...args} />
);

Standard.args = {
  definition: { defaultValue: 'bob', id: 'test', name: 'bob', type: 'SecureObject' },
};
