import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import workflow from '../../../../__mocks__/workflows/Conditionals.json';

export const App = () => {
  return (
    <DesignerProvider locale="en-US" options={{}}>
      {workflow ? (
        <BJSWorkflowProvider workflow={workflow.definition}>
          <Designer></Designer>
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
