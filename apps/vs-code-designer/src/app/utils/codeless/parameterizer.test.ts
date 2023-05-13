import { parameterizeConnectionReference } from './parameterizer';
import type { ConnectionReferenceModel } from '@microsoft/vscode-extension';

describe('parameterizeConnectionReference()', () => {
  it('should expose a parameterizeConnectionReference', () => {
    expect(parameterizeConnectionReference).toBeDefined();
  });

  it('should parameterize Connection Reference', () => {
    let connection: ConnectionReferenceModel = {
      api: {
        id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/providers/Microsoft.Web/locations/eastus2/managedApis/applicationinsights',
      },
      connection: {
        id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/resourceGroups/vs-code-debug/providers/Microsoft.Web/connections/applicationinsights',
      },
      connectionRuntimeUrl: 'https://common.logic-centralus.azure-apihub.net/apim/applicationinsights/1d4fec3c6d774d2ca57a0dd5cc6e7c1e/',
      authentication: {
        type: 'Raw',
        scheme: 'Key',
        parameter: "@appsetting('arm-connectionKey')",
      },
      connectionProperties: null,
    };

    const parameters: any = {};
    connection = parameterizeConnectionReference(connection, 'applicationinsights', parameters);

    const expected = {
      api: {
        id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/providers/Microsoft.Web/locations/@{appsetting('WORKFLOWS_LOCATION_NAME')}/managedApis/applicationinsights",
      },
      connection: {
        id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/resourceGroups/@{appsetting('WORKFLOWS_RESOURCE_GROUP_NAME')}/providers/Microsoft.Web/connections/applicationinsights",
      },
      connectionRuntimeUrl: "@parameters('applicationinsightsConnectionRuntimeUrl')",
      authentication: "@parameters('applicationinsightsAuthentication')",
      connectionProperties: null,
    };

    expect(connection.api.id).toBe(expected.api.id);
    expect(connection.connection.id).toBe(expected.connection.id);
    expect(connection.connectionRuntimeUrl).toBe(expected.connectionRuntimeUrl);
    expect(connection.authentication).toBe(expected.authentication);
    expect(Object.keys(parameters).length).toBe(2);
  });
});
