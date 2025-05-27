import { parameterizeConnection, areAllConnectionsParameterized } from '../parameterizer';
import type {
  ConnectionReferenceModel,
  FunctionConnectionModel,
  APIManagementConnectionModel,
  ConnectionsData,
} from '@microsoft/vscode-extension-logic-apps';
import { describe, it, expect } from 'vitest';

describe('areAllConnectionsParameterized', () => {
  it('should return true when all connections are parameterized', () => {
    const connectionsDataOne: ConnectionsData = {
      managedApiConnections: {
        connection1: {
          api: {
            id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/providers/Microsoft.Web/locations/@{appsetting('WORKFLOWS_LOCATION_NAME')}/managedApis/connection1",
          },
          connection: {
            id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/resourceGroups/@{appsetting('WORKFLOWS_RESOURCE_GROUP_NAME')}/providers/Microsoft.Web/connections/connection1",
          },
          connectionRuntimeUrl: "@parameters('connection1-ConnectionRuntimeUrl')",
          authentication: {
            type: 'Raw',
            scheme: 'Key',
            parameter: "@appsetting('connection1-connectionKey')",
          },
        },
      },
      functionConnections: {
        function1: {
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
        },
      },
      apiManagementConnections: {
        apiManagement1: {
          apiId:
            '/subscriptions/subscription-test-id/resourceGroups/vs-code-debug/providers/Microsoft.ApiManagement/service/vscodeservicename/apis/echo-api',
          baseUrl: "@parameters('apiManagementOperation-BaseUrl')",
          subscriptionKey: "@appsetting('apiManagementOperation_SubscriptionKey')",
          displayName: 'api01',
        },
      },
    };

    const connectionsDataTwo: ConnectionsData = {
      managedApiConnections: {
        connection1: {
          api: {
            id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/providers/Microsoft.Web/locations/@{appsetting('WORKFLOWS_LOCATION_NAME')}/managedApis/connection1",
          },
          connection: {
            id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/resourceGroups/@{appsetting('WORKFLOWS_RESOURCE_GROUP_NAME')}/providers/Microsoft.Web/connections/connection1",
          },
          connectionRuntimeUrl: "@parameters('connection1-ConnectionRuntimeUrl')",
          authentication: {
            type: 'Raw',
            scheme: 'Key',
            parameter: "@appsetting('connection1-connectionKey')",
          },
        },
      },
      functionConnections: {
        function1: {
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
        },
      },
      apiManagementConnections: {
        apiManagement1: {
          apiId:
            '/subscriptions/@{appsetting(WORKFLOWS_SUBSCRIPTION_ID)}/resourceGroups/@{parameters(azureFunctionOperation-ResourceGroup)}/providers/Microsoft.ApiManagement/service/vscodeservicename/apis/echo-api',
          baseUrl: "@parameters('apiManagementOperation-BaseUrl')",
          subscriptionKey: "@appsetting('apiManagementOperation_SubscriptionKey')",
          displayName: 'api01',
        },
      },
    };

    expect(areAllConnectionsParameterized(connectionsDataOne)).toBe(true);
    expect(areAllConnectionsParameterized(connectionsDataTwo)).toBe(true);
  });

  it('should return false when not all connections are parameterized', () => {
    const connectionsData: ConnectionsData = {
      managedApiConnections: {
        connection1: {
          api: {
            id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/providers/Microsoft.Web/locations/@{appsetting('WORKFLOWS_LOCATION_NAME')}/managedApis/connection1",
          },
          connection: {
            id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/resourceGroups/@{appsetting('WORKFLOWS_RESOURCE_GROUP_NAME')}/providers/Microsoft.Web/connections/connection1",
          },
          connectionRuntimeUrl: "@parameters('connection1-ConnectionRuntimeUrl')",
          authentication: {
            type: 'Raw',
            scheme: 'Key',
            parameter: "@appsetting('connection1-connectionKey')",
          },
        },
      },
      functionConnections: {
        function1: {
          function: {
            id: '/subscriptions/subscription-test-id/resourceGroups/vs-code-debug/providers/Microsoft.Web/sites/vscodesite/functions/HttpTrigger',
          },
          triggerUrl: 'https://vscodesite.azurewebsites.net/api/httptrigger',
          authentication: {
            type: 'QueryString',
            name: 'Code',
            value: "@appsetting('azureFunctionOperation_functionAppKey')",
          },
          displayName: 'func01',
        },
      },
      apiManagementConnections: {
        apiManagement1: {
          apiId:
            '/subscriptions/subscription-test-id/resourceGroups/vs-code-debug/providers/Microsoft.ApiManagement/service/vscodeservicename/apis/echo-api',
          baseUrl: "@parameters('apiManagementOperation-BaseUrl')",
          subscriptionKey: "@appsetting('apiManagementOperation_SubscriptionKey')",
          displayName: 'api01',
        },
      },
    };

    const result = areAllConnectionsParameterized(connectionsData);
    expect(result).toBe(false);
  });

  it('should return true when connectionsData is empty', () => {
    const connectionsData: ConnectionsData = {};

    const result = areAllConnectionsParameterized(connectionsData);
    expect(result).toBe(true);
  });
});

describe('parameterizeConnection for ConnectionReferenceModel', () => {
  it('should parameterize Connection Reference', () => {
    let connection: ConnectionReferenceModel = {
      api: {
        id: '/subscriptions/subscription-test-id/providers/Microsoft.Web/locations/eastus2/managedApis/applicationinsights',
      },
      connection: {
        id: '/subscriptions/subscription-test-id/resourceGroups/vs-code-debug/providers/Microsoft.Web/connections/applicationinsights',
      },
      connectionRuntimeUrl: 'https://common.logic-centralus.azure-apihub.net/apim/applicationinsights/12345/',
      authentication: {
        type: 'Raw',
        scheme: 'Key',
        parameter: "@appsetting('arm-connectionKey')",
      },
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
    expect(parameters['applicationinsights-ConnectionRuntimeUrl']).toBeDefined();
    expect(parameters['applicationinsights-Authentication']).toBeDefined();
  });

  it('should parameterize Connection Reference for custom connector', () => {
    let connection: ConnectionReferenceModel = {
      api: {
        id: '/subscriptions/subscription-test-id/resourceGroups/vs-code-debug-connector/providers/Microsoft.Web/customApis/customconnector',
      },
      connection: {
        id: '/subscriptions/subscription-test-id/resourceGroups/vs-code-debug/providers/Microsoft.Web/connections/customconnector',
      },
      connectionRuntimeUrl: 'https://common.logic-centralus.azure-apihub.net/apim/customconnector/12345/',
      authentication: {
        type: 'ManagedServiceIdentity',
      },
    };

    const parameters: any = {};
    const settings: Record<string, string> = {};
    connection = parameterizeConnection(connection, 'customconnector', parameters, settings) as ConnectionReferenceModel;

    const expected = {
      api: {
        id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/resourceGroups/@{appsetting('CUSTOM_CONNECTOR_RESOURCE_GROUP_NAME')}/providers/Microsoft.Web/customApis/customconnector",
      },
      connection: {
        id: "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/resourceGroups/@{appsetting('WORKFLOWS_RESOURCE_GROUP_NAME')}/providers/Microsoft.Web/connections/customconnector",
      },
      connectionRuntimeUrl: "@parameters('customconnector-ConnectionRuntimeUrl')",
      authentication: "@parameters('customconnector-Authentication')",
      connectionProperties: null,
    };

    expect(connection.api.id).toBe(expected.api.id);
    expect(connection.connection.id).toBe(expected.connection.id);
    expect(connection.connectionRuntimeUrl).toBe(expected.connectionRuntimeUrl);
    expect(connection.authentication).toBe(expected.authentication);
    expect(Object.keys(parameters).length).toBe(2);
    expect(Object.keys(settings).length).toBe(2);
    expect(settings['CUSTOM_CONNECTOR_RESOURCE_GROUP_NAME']).toBeDefined();
    expect(settings['CUSTOM_CONNECTOR_RESOURCE_GROUP_NAME']).toEqual('vs-code-debug-connector');
    expect(parameters['customconnector-ConnectionRuntimeUrl']).toBeDefined();
    expect(parameters['customconnector-Authentication']).toBeDefined();
  });
});

describe('parameterizeConnection for FunctionConnectionModel', () => {
  it('should parameterize Connection Reference', () => {
    let connection: FunctionConnectionModel = {
      function: {
        id: '/subscriptions/subscription-test-id/resourceGroups/vs-code-debug/providers/Microsoft.Web/sites/vscodesite/functions/HttpTrigger',
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
    expect(parameters['azureFunctionOperation-ResourceGroup']).toBeDefined();
    expect(parameters['azureFunctionOperation-SiteName']).toBeDefined();
    expect(parameters['azureFunctionOperation-TriggerUrl']).toBeDefined();
  });
});

describe('parameterizeConnection for APIManagementConnectionModel', () => {
  it('should parameterize Connection Reference', () => {
    let connection: APIManagementConnectionModel = {
      apiId:
        '/subscriptions/subscription-test-id/resourceGroups/vs-code-debug/providers/Microsoft.ApiManagement/service/vscodeservicename/apis/echo-api',
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
    expect(parameters['apiManagementOperation-ResourceGroup']).toBeDefined();
    expect(parameters['apiManagementOperation-ServiceName']).toBeDefined();
    expect(parameters['apiManagementOperation-BaseUrl']).toBeDefined();
  });
});
