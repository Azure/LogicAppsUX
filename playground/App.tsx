import React from 'react';
import { DesignerProvider } from '@designer/core/DesignerProvider';
import { BJSWorkflowProvider } from '@designer/core';
import TestWorkflow from '../__mocks__/workflows/simpleBigworkflow.json';
import { Designer } from '@designer/ui';
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
