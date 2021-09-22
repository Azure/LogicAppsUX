import React from 'react';
import { DesignerProvider } from '@designer/core/DesignerProvider';
import { BJSWorkflowProvider } from '@designer/core';
import { ReactFlowFromWorkflow } from './playground-entries/react-flow-from-workflow';

function App() {
  return (
    <DesignerProvider locale="en-XA">
      <BJSWorkflowProvider workflow={{} as any}>
        <ReactFlowFromWorkflow />
      </BJSWorkflowProvider>
    </DesignerProvider>
  );
}

export default App;
