// Button.stories.ts | Button.stories.tsx

import React, { createRef } from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';

import { WorkflowParameter, WorkflowParameterDefinition } from './_workflowparameter';
import { WorkflowParametersPanel, WorkflowParametersPanelProps } from './_workflowparameterspanel';
import { ActionButtonV2 } from './../actionbuttonv2/index';

export default {
  component: WorkflowParametersPanel,
  title: 'Components/WorkflowParametersPanel',
} as ComponentMeta<typeof WorkflowParametersPanel>;
const _panelRef = createRef<WorkflowParametersPanel>();
export const Standard: ComponentStory<typeof WorkflowParametersPanel> = (args: WorkflowParametersPanelProps) => (
  <>
    <div>
      <ActionButtonV2 title="open parameters" onClick={() => _panelRef.current?.showPanel()} />
    </div>
    <WorkflowParametersPanel {...args} ref={_panelRef} />
  </>
);

Standard.args = {
  parameters: [
    { defaultValue: '{}', id: 'test', name: 'test', type: 'SecureObject' },
    { defaultValue: 'test2', id: 'test2', name: 'Hello', type: 'Bool' },
  ],
};
