import { BJSWorkflowProvider, Designer, DesignerProvider } from '../index';
import TestWorkflow from './simpleBigworkflow.json';

export default {
  component: DesignerProvider,
  subcomponents: { BJSWorkflowProvider, Designer },
  title: 'Designer/Designer Composition',
};

export const SimpleButBigDefinition = () => (
  <div style={{ height: '100vh' }}>
    <DesignerProvider locale="en-US">
      <BJSWorkflowProvider workflow={TestWorkflow.definition}>
        <Designer></Designer>
      </BJSWorkflowProvider>
    </DesignerProvider>
  </div>
);
