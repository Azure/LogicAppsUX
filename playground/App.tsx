import React from 'react';
import { DesignerProvider } from '@designer/core/DesignerProvider';
import { BJSWorkflowProvider } from '@designer/core';

function App() {
  return (
    <DesignerProvider locale="en">
      <BJSWorkflowProvider workflow={{} as any}>
        <div>Hello World</div>
      </BJSWorkflowProvider>
    </DesignerProvider>
  );
}

export default App;
