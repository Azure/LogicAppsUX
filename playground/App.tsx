import React from 'react';
import { Checkbox } from '@designer/ui/checkbox';
import { DesignerProvider } from '@designer/core/DesignerProvider';

function App() {
  return (
    <DesignerProvider locale="en">
      <Checkbox descriptionText="Hello World" text="Hello World!" />
    </DesignerProvider>
  );
}

export default App;
