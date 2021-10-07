import TestWorkflow from '../../../../libs/designer/src/lib/stories/simpleBigworkflow.json';
import {
  DesignerProvider,
  BJSWorkflowProvider,
  Designer,
} from '@microsoft/logic-apps-designer';
export function App() {
  return (
    <DesignerProvider locale="en-US">
      <BJSWorkflowProvider workflow={TestWorkflow.definition}>
        <Designer></Designer>
      </BJSWorkflowProvider>
    </DesignerProvider>
  );
}

export default App;
