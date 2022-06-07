import workflow from '../../../../__mocks__/workflows/Conditionals.json';
import { HttpClient } from './httpClient';
import {
  StandardConnectionService,
  StandardOperationManifestService,
  StandardSearchService,
} from '@microsoft-logic-apps/designer-client-services';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';

const httpClient = new HttpClient();
const connectionService = new StandardConnectionService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
});
const operationManifestService = new StandardOperationManifestService({
  apiVersion: '2018-11-01',
  baseUrl: 'url',
  httpClient,
});
const searchService = new StandardSearchService();
export const App = () => {
  return (
    <DesignerProvider
      locale="en-US"
      options={{
        services: {
          connectionService,
          operationManifestService,
          searchService,
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
