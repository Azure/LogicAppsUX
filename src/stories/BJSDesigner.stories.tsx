// List.stories.js | List.stories.jsx

import React from 'react';
import { BJSWorkflowProvider, Designer, DesignerProvider } from '..';
import TestWorkflow from '../../__mocks__/workflows/simpleBigworkflow.json';

export default {
  component: DesignerProvider,
  subcomponents: { BJSWorkflowProvider, Designer }, //👈 Adds the ListItem component as a subcomponent
  title: 'Designer Composition',
};

export const DesignerComp = () => (
  <DesignerProvider locale="en-US">
    <BJSWorkflowProvider workflow={TestWorkflow.definition}>
      <Designer></Designer>
    </BJSWorkflowProvider>
  </DesignerProvider>
);
