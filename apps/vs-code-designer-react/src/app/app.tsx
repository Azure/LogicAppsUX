import workflow from '../../../../__mocks__/workflows/Conditionals.json';
import { HttpClient } from './httpClient';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';

const httpClient = new HttpClient();
export const App = () => {
  return (
    <DesignerProvider
      locale="en-US"
      options={{
        services: {
          httpClient,
        },
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
