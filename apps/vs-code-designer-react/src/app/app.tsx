import workflow from '../../../../__mocks__/workflows/Conditionals.json';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';

export const App = () => {
  const getToken = () => '';
  return (
    <DesignerProvider
      locale="en-US"
      options={{
        getToken,
      }}
    >
      {workflow ? (
        <BJSWorkflowProvider workflow={workflow.definition}>
          <Designer></Designer>
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
