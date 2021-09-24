import React from 'react';
import { DesignerProvider } from '@designer/core/DesignerProvider';
import { BJSWorkflowProvider } from '@designer/core';
import TestWorkflow from '../__mocks__/workflows/simpleBigworkflow.json';
function App() {
  return (
    <DesignerProvider locale="en-US">
      <BJSWorkflowProvider workflow={TestWorkflow.definition}>
        <div></div>
      </BJSWorkflowProvider>
    </DesignerProvider>
  );
}

export default App;
