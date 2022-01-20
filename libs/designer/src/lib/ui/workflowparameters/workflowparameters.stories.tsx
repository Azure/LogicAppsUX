// workflowparameter.stories.ts | workflowparameter.stories.tsx

import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { WorkflowParameterView, WorkflowParameterViewProps } from './';

export default {
  component: WorkflowParameterView,
  title: 'Components/WorkflowParametersPanelView',
} as ComponentMeta<typeof WorkflowParameterView>;
export const Standard: ComponentStory<typeof WorkflowParameterView> = (args: WorkflowParameterViewProps) => (
  <WorkflowParameterView {...args} />
);

Standard.args = {
//   parameters: [{ defaultValue: 'bob', id: 'test', name: 'bob', type: 'SecureObject' }],
};
