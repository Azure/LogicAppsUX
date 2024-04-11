import { parameterizeConnection } from '../parameterizer';
import type {
  ConnectionReferenceModel,
  FunctionConnectionModel,
  APIManagementConnectionModel,
} from '@microsoft/vscode-extension-logic-apps';
import { describe, it, expect } from 'vitest';

describe('parameterizeConnection', () => {
  it('should expose a parameterizeConnection', () => {
    expect(parameterizeConnection).toBeDefined();
  });
});

describe('parameterizeConnection for ConnectionReferenceModel', () => {
  it('should parameterize Connection Reference', () => {
    let connection: ConnectionReferenceModel = {
      api: {
        id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/providers/Microsoft.Web/locations/eastus2/managedApis/applicationinsights',
      },
      connection: {
        id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/resourceGroups/vs-code-debug/providers/Microsoft.Web/connections/applicationinsights',
      },
      connectionRuntimeUrl: 'https://common.logic-centralus.azure-apihub.net/apim/applicationinsights/12345/',
      authentication: {
        type: 'Raw',
        scheme: 'Key',
        parameter: "@appsetting('arm-connectionKey')",
      },
      connectionProperties: null,
    };

    const parameters: any = {};
    const settings: Record<string, string> = {};
    connection = parameterizeConnection(connection, 'applicationinsights', parameters, settings) as ConnectionReferenceModel;

    const expected = {
      api: {
        id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/providers/Microsoft.Web/locations/@{appsetting('WORKFLOWS_LOCATION_NAME')}/managedApis/applicationinsights",
      },
      connection: {
        id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/resourceGroups/@{appsetting('WORKFLOWS_RESOURCE_GROUP_NAME')}/providers/Microsoft.Web/connections/applicationinsights",
      },
      connectionRuntimeUrl: "@parameters('applicationinsights-ConnectionRuntimeUrl')",
      authentication: "@parameters('applicationinsights-Authentication')",
      connectionProperties: null,
    };

    expect(connection.api.id).toBe(expected.api.id);
    expect(connection.connection.id).toBe(expected.connection.id);
    expect(connection.connectionRuntimeUrl).toBe(expected.connectionRuntimeUrl);
    expect(connection.authentication).toBe(expected.authentication);
    expect(Object.keys(parameters).length).toBe(2);
    expect(Object.keys(settings).length).toBe(1);
    expect(parameters['applicationinsights-ConnectionRuntimeUrl']).not.toBeUndefined();
    expect(parameters['applicationinsights-Authentication']).not.toBeUndefined();
  });
});

describe('parameterizeConnection for FunctionConnectionModel', () => {
  it('should parameterize Connection Reference', () => {
    let connection: FunctionConnectionModel = {
      function: {
        id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/resourceGroups/vs-code-debug/providers/Microsoft.Web/sites/vscodesite/functions/HttpTrigger',
      },
      triggerUrl: 'https://vscodesite.azurewebsites.net/api/httptrigger',
      authentication: {
        type: 'QueryString',
        name: 'Code',
        value: "@appsetting('azureFunctionOperation_functionAppKey')",
      },
      displayName: 'func01',
    };

    const parameters: any = {};
    const settings: Record<string, string> = {};
    connection = parameterizeConnection(connection, 'azureFunctionOperation', parameters, settings) as FunctionConnectionModel;

    const expected = {
      function: {
        id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/resourceGroups/@{parameters('azureFunctionOperation-ResourceGroup')}/providers/Microsoft.Web/sites/@{parameters('azureFunctionOperation-SiteName')}/functions/HttpTrigger",
      },
      triggerUrl: "@parameters('azureFunctionOperation-TriggerUrl')",
      authentication: {
        type: 'QueryString',
        name: 'Code',
        value: "@appsetting('azureFunctionOperation_functionAppKey')",
      },
      displayName: 'func01',
    };

    expect(connection.function.id).toBe(expected.function.id);
    expect(connection.triggerUrl).toBe(expected.triggerUrl);
    expect(connection.authentication).toStrictEqual(expected.authentication);
    expect(Object.keys(parameters).length).toBe(3);
    expect(Object.keys(settings).length).toBe(0);
    expect(parameters['azureFunctionOperation-ResourceGroup']).not.toBeUndefined();
    expect(parameters['azureFunctionOperation-SiteName']).not.toBeUndefined();
    expect(parameters['azureFunctionOperation-TriggerUrl']).not.toBeUndefined();
  });
});

describe('parameterizeConnection for APIManagementConnectionModel', () => {
  it('should parameterize Connection Reference', () => {
    let connection: APIManagementConnectionModel = {
      apiId:
        '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/resourceGroups/vs-code-debug/providers/Microsoft.ApiManagement/service/vscodeservicename/apis/echo-api',
      baseUrl: "@parameters('apiManagementOperation-BaseUrl')",
      subscriptionKey: "@appsetting('apiManagementOperation_SubscriptionKey')",
      displayName: 'api01',
    };

    const parameters: any = {};
    const settings: Record<string, string> = {};
    connection = parameterizeConnection(connection, 'apiManagementOperation', parameters, settings) as APIManagementConnectionModel;

    const expected = {
      apiId:
        "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/resourceGroups/@{parameters('apiManagementOperation-ResourceGroup')}/providers/Microsoft.ApiManagement/service/@{parameters('apiManagementOperation-ServiceName')}/apis/echo-api",
      baseUrl: "@parameters('apiManagementOperation-BaseUrl')",
      subscriptionKey: "@appsetting('apiManagementOperation_SubscriptionKey')",
      displayName: 'api01',
    };

    expect(connection.apiId).toBe(expected.apiId);
    expect(connection.baseUrl).toBe(expected.baseUrl);
    expect(connection.subscriptionKey).toBe(expected.subscriptionKey);
    expect(Object.keys(parameters).length).toBe(3);
    expect(Object.keys(settings).length).toBe(0);
    expect(parameters['apiManagementOperation-ResourceGroup']).not.toBeUndefined();
    expect(parameters['apiManagementOperation-ServiceName']).not.toBeUndefined();
    expect(parameters['apiManagementOperation-BaseUrl']).not.toBeUndefined();
  });
});
