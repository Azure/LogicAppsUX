import React, { useState } from 'react';
import { WorkflowParametersPanel } from './_workflowparametersPanel';
import { ActionButtonV2 } from './../actionbuttonv2';
import { WorkflowParameterDefinition } from './_workflowparameter';

export interface WorkflowParameterViewProps {
  parameters?: WorkflowParameterDefinition[];
}

export const WorkflowParameterView = ({ parameters }: WorkflowParameterViewProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <ActionButtonV2 title="open parameters" onClick={() => setIsOpen(true)} />
      <WorkflowParametersPanel
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        onDismiss={(): void => {
          console.log('Workflow Parameters Panel Closed');
        }}
        parameters={parameters ? parameters : []}
      />
    </>
  );
};
