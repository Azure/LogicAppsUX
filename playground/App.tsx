import React from 'react';
import { DesignerProvider } from '../src/core/DesignerProvider';
import { BJSWorkflowProvider } from '../src/core';
import TestWorkflow from '../__mocks__/workflows/simpleBigworkflow.json';
import { Designer } from '../src/ui';
function App() {
  return (
    <DesignerProvider locale="en-US">
      <BJSWorkflowProvider workflow={TestWorkflow.definition}>
        <Designer></Designer>
      </BJSWorkflowProvider>
    </DesignerProvider>
  );
}

export default App;
