import { BJSWorkflowProvider, Designer, DesignerProvider } from '../index';
import TestWorkflow from './simpleBigworkflow.json';

export default {
  component: DesignerProvider,
  subcomponents: { BJSWorkflowProvider, Designer }, //👈 Adds the ListItem component as a subcomponent
  title: 'Designer/Designer Composition',
};

export const SimpleButBigDefinition = () => (
  <DesignerProvider locale="en-US">
    <BJSWorkflowProvider workflow={TestWorkflow.definition}>
      <Designer></Designer>
    </BJSWorkflowProvider>
  </DesignerProvider>
);
