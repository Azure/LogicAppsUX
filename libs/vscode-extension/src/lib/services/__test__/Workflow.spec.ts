import { describe, it, expect } from 'vitest';
import { resolveConnectionsReferences } from '../Workflow';

describe('resolveConnectionsReferences', () => {
  it('should replace parameter references with their corresponding values', () => {
    const content = `"@parameters('foo')"`;
    const parameters = {
      foo: {
        type: 'String',
        value: 'bar',
      },
    };
    const result = resolveConnectionsReferences(content, parameters);
    expect(result).toEqual('bar');
  });

  it('should replace appsetting references with their corresponding values', () => {
    const content = `"@appsetting('foo')"`;
    const appsettings = {
      foo: 'bar',
    };
    const result = resolveConnectionsReferences(content, undefined, appsettings);
    expect(result).toEqual('bar');
  });

  it('should replace appsetting and parameters references with their corresponding values', () => {
    const content = `"@parameters('foo')"`;
    const parameters = {
      foo: {
        type: 'Object',
        value: {
          api: {
            id: "@{appsetting('foo')}",
          },
        },
      },
    };
    const appsettings = {
      foo: 'bar',
    };
    const result = resolveConnectionsReferences(content, parameters, appsettings);
    expect(result).toEqual({ api: { id: 'bar' } });
  });

  it('should not replace appsetting references if the value is a KeyVault reference', () => {
    const content = `"@appsetting('foo')"`;
    const appsettings = {
      foo: '@Microsoft.KeyVault(secret)',
    };
    const result = resolveConnectionsReferences(content, undefined, appsettings);
    expect(result).toEqual("@appsetting('foo')");
  });

  it('should replace both parameter and appsetting references', () => {
    const content = `"@parameters('foo') - @appsetting('bar')"`;
    const parameters = {
      foo: {
        type: 'String',
        value: 'hello',
      },
    };
    const appsettings = {
      bar: 'world',
    };
    const result = resolveConnectionsReferences(content, parameters, appsettings);
    expect(result).toEqual('hello - world');
  });

  it('should return the original content if no parameters or appsettings are provided', () => {
    const content = `"@parameters('foo') - @appsetting('bar')"`;
    const result = resolveConnectionsReferences(content, undefined);
    expect(result).toEqual("@parameters('foo') - @appsetting('bar')");
  });

  it('should throw an error if the resolved content is not a valid JSON', () => {
    expect(() => {
      resolveConnectionsReferences('', {});
    }).toThrowError(new Error('Failure in resolving connection parameterization'));
  });

  // Realistic test cases based on actual Logic App connection data
  it('should resolve Office 365 connection with realistic structure', () => {
    const content = `{
      "managedApiConnections": {
        "office365": {
          "api": {
            "id": "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/providers/Microsoft.Web/locations/@{appsetting('WORKFLOWS_LOCATION_NAME')}/managedApis/office365"
          },
          "connection": {
            "id": "/subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/resourceGroups/@{appsetting('WORKFLOWS_RESOURCE_GROUP_NAME')}/providers/Microsoft.Web/connections/office365-40"
          },
          "connectionRuntimeUrl": "@parameters('office365-ConnectionRuntimeUrl')",
          "authentication": "@parameters('office365-Authentication')"
        }
      }
    }`;

    const parameters = {
      'office365-ConnectionRuntimeUrl': {
        type: 'String',
        value: 'https://test.azure-apihub.net/apim/office365/test-connection/',
      },
      'office365-Authentication': {
        type: 'Object',
        value: {
          type: 'Raw',
          scheme: 'Key',
          parameter: 'test-key-value',
        },
      },
    };

    const appsettings = {
      WORKFLOWS_SUBSCRIPTION_ID: 'test-subscription-id',
      WORKFLOWS_LOCATION_NAME: 'eastus',
      WORKFLOWS_RESOURCE_GROUP_NAME: 'test-rg',
    };

    const result = resolveConnectionsReferences(content, parameters, appsettings);

    expect(result).toEqual({
      managedApiConnections: {
        office365: {
          api: {
            id: '/subscriptions/test-subscription-id/providers/Microsoft.Web/locations/eastus/managedApis/office365',
          },
          connection: {
            id: '/subscriptions/test-subscription-id/resourceGroups/test-rg/providers/Microsoft.Web/connections/office365-40',
          },
          connectionRuntimeUrl: 'https://test.azure-apihub.net/apim/office365/test-connection/',
          authentication: {
            type: 'Raw',
            scheme: 'Key',
            parameter: 'test-key-value',
          },
        },
      },
    });
  });

  it('should resolve nested appsetting references within parameter values', () => {
    const content = `{
      "authentication": "@parameters('auth-config')",
      "connectionUrl": "@parameters('connection-url')"
    }`;

    const parameters = {
      'auth-config': {
        type: 'Object',
        value: {
          type: 'Raw',
          scheme: 'Key',
          parameter: "@appsetting('connection-key')",
        },
      },
      'connection-url': {
        type: 'String',
        value: "@appsetting('base-url')",
      },
    };

    const appsettings = {
      'connection-key': 'secret-key-123',
      'base-url': 'https://test.azure.com/api',
    };

    const result = resolveConnectionsReferences(content, parameters, appsettings);

    expect(result).toEqual({
      authentication: {
        type: 'Raw',
        scheme: 'Key',
        parameter: 'secret-key-123',
      },
      connectionUrl: 'https://test.azure.com/api',
    });
  });

  it('should handle multiple connection types with different parameter patterns', () => {
    const content = `{
      "managedApiConnections": {
        "office365": {
          "connectionRuntimeUrl": "@parameters('office365-ConnectionRuntimeUrl')",
          "authentication": "@parameters('office365-Authentication')"
        },
        "sqlserver": {
          "connectionString": "@{appsetting('SQL_CONNECTION_STRING')}",
          "authentication": "@{parameters('sql-auth')}"
        }
      }
    }`;

    const parameters = {
      'office365-ConnectionRuntimeUrl': {
        type: 'String',
        value: 'https://test-office365.azure-apihub.net/',
      },
      'office365-Authentication': {
        type: 'Object',
        value: { type: 'OAuth' },
      },
      'sql-auth': {
        type: 'Object',
        value: { type: 'SqlAuthentication', username: 'testuser' },
      },
    };

    const appsettings = {
      SQL_CONNECTION_STRING: 'Server=test;Database=test;',
    };

    const result = resolveConnectionsReferences(content, parameters, appsettings);

    expect(result).toEqual({
      managedApiConnections: {
        office365: {
          connectionRuntimeUrl: 'https://test-office365.azure-apihub.net/',
          authentication: { type: 'OAuth' },
        },
        sqlserver: {
          connectionString: 'Server=test;Database=test;',
          authentication: { type: 'SqlAuthentication', username: 'testuser' },
        },
      },
    });
  });

  it('should handle authentication object with nested appsetting references', () => {
    const content = `{
      "authentication": "@parameters('auth-config')"
    }`;

    const parameters = {
      'auth-config': {
        type: 'Object',
        value: {
          type: 'Raw',
          scheme: 'Key',
          parameter: "@appsetting('connection-key')",
          audience: "@{appsetting('AUDIENCE_URL')}",
        },
      },
    };

    const appsettings = {
      'connection-key': 'secret-key-123',
      AUDIENCE_URL: 'https://test-audience.azure.com',
    };

    const result = resolveConnectionsReferences(content, parameters, appsettings);

    expect(result).toEqual({
      authentication: {
        type: 'Raw',
        scheme: 'Key',
        parameter: 'secret-key-123',
        audience: 'https://test-audience.azure.com',
      },
    });
  });

  it('should handle mixed URL patterns with appsetting substitutions', () => {
    const content = `{
      "endpoints": {
        "management": "@{appsetting('WORKFLOWS_MANAGEMENT_BASE_URI')}subscriptions/@{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}/",
        "runtime": "@parameters('runtime-url')"
      }
    }`;

    const parameters = {
      'runtime-url': {
        type: 'String',
        value: "@appsetting('RUNTIME_BASE_URL')/api/v1",
      },
    };

    const appsettings = {
      WORKFLOWS_MANAGEMENT_BASE_URI: 'https://management.azure.com/',
      WORKFLOWS_SUBSCRIPTION_ID: 'test-sub-123',
      RUNTIME_BASE_URL: 'https://test-runtime.azure.com',
    };

    const result = resolveConnectionsReferences(content, parameters, appsettings);

    expect(result).toEqual({
      endpoints: {
        management: 'https://management.azure.com/subscriptions/test-sub-123/',
        runtime: 'https://test-runtime.azure.com/api/v1',
      },
    });
  });

  it('should handle empty parameter values and preserve structure', () => {
    const content = `{
      "config": {
        "optionalValue": "@parameters('optional-param')",
        "requiredValue": "@appsetting('required-setting')"
      }
    }`;

    const parameters = {
      'optional-param': {
        type: 'String',
        value: undefined,
      },
    };

    const appsettings = {
      'required-setting': 'test-value',
    };

    const result = resolveConnectionsReferences(content, parameters, appsettings);

    expect(result).toEqual({
      config: {
        optionalValue: '',
        requiredValue: 'test-value',
      },
    });
  });

  it('should skip KeyVault references and preserve parameter substitutions', () => {
    const content = `{
      "connections": {
        "secretConnection": "@appsetting('keyvault-secret')",
        "normalConnection": "@parameters('normal-connection')"
      }
    }`;

    const parameters = {
      'normal-connection': {
        type: 'String',
        value: 'test-connection-string',
      },
    };

    const appsettings = {
      'keyvault-secret': '@Microsoft.KeyVault(SecretUri=https://vault.vault.azure.net/secrets/test)',
      'normal-setting': 'normal-value',
    };

    const result = resolveConnectionsReferences(content, parameters, appsettings);

    expect(result).toEqual({
      connections: {
        secretConnection: "@appsetting('keyvault-secret')",
        normalConnection: 'test-connection-string',
      },
    });
  });

  it('should handle multiple identical appsetting references that preserve JSON structure', () => {
    const content = `{
      "connections": {
        "primary": {
          "subscriptionId": "@{appsetting('SUBSCRIPTION_ID')}",
          "resourceGroup": "@{appsetting('RESOURCE_GROUP')}"
        },
        "secondary": {
          "subscriptionId": "@{appsetting('SUBSCRIPTION_ID')}",
          "location": "@{appsetting('LOCATION')}"
        }
      },
      "metadata": {
        "subscription": "@{appsetting('SUBSCRIPTION_ID')}",
        "environment": "@{appsetting('ENVIRONMENT')}"
      }
    }`;

    const appsettings = {
      SUBSCRIPTION_ID: 'sub-12345',
      RESOURCE_GROUP: 'prod-rg',
      LOCATION: 'eastus',
      ENVIRONMENT: 'production',
    };

    const result = resolveConnectionsReferences(content, undefined, appsettings);

    expect(result).toEqual({
      connections: {
        primary: {
          subscriptionId: 'sub-12345',
          resourceGroup: 'prod-rg',
        },
        secondary: {
          subscriptionId: 'sub-12345',
          location: 'eastus',
        },
      },
      metadata: {
        subscription: 'sub-12345',
        environment: 'production',
      },
    });
  });

  it('should handle complex workflow with multiple connection types using parameters', () => {
    const content = `{
      "managedApiConnections": {
        "azureblob": {
          "connectionRuntimeUrl": "@parameters('blob-runtime-url')",
          "authentication": "@parameters('blob-auth')",
          "metadata": {
            "subscription": "@{appsetting('SUBSCRIPTION_ID')}",
            "location": "@{appsetting('LOCATION')}"
          }
        },
        "servicebus": {
          "connectionRuntimeUrl": "@parameters('sb-runtime-url')",
          "authentication": "@parameters('sb-auth')",
          "metadata": {
            "subscription": "@{appsetting('SUBSCRIPTION_ID')}",
            "resourceGroup": "@{appsetting('RESOURCE_GROUP')}"
          }
        }
      },
      "environment": {
        "subscription": "@{appsetting('SUBSCRIPTION_ID')}",
        "location": "@{appsetting('LOCATION')}",
        "resourceGroup": "@{appsetting('RESOURCE_GROUP')}"
      }
    }`;

    const parameters = {
      'blob-runtime-url': {
        type: 'String',
        value: 'https://blob-runtime.azure.com',
      },
      'blob-auth': {
        type: 'Object',
        value: { type: 'ManagedServiceIdentity' },
      },
      'sb-runtime-url': {
        type: 'String',
        value: 'https://servicebus-runtime.azure.com',
      },
      'sb-auth': {
        type: 'Object',
        value: { type: 'Raw', scheme: 'Key', parameter: 'test-sb-key' },
      },
    };

    const appsettings = {
      SUBSCRIPTION_ID: 'sub-12345',
      LOCATION: 'westus2',
      RESOURCE_GROUP: 'prod-rg',
    };

    const result = resolveConnectionsReferences(content, parameters, appsettings);

    expect(result).toEqual({
      managedApiConnections: {
        azureblob: {
          connectionRuntimeUrl: 'https://blob-runtime.azure.com',
          authentication: { type: 'ManagedServiceIdentity' },
          metadata: {
            subscription: 'sub-12345',
            location: 'westus2',
          },
        },
        servicebus: {
          connectionRuntimeUrl: 'https://servicebus-runtime.azure.com',
          authentication: { type: 'Raw', scheme: 'Key', parameter: 'test-sb-key' },
          metadata: {
            subscription: 'sub-12345',
            resourceGroup: 'prod-rg',
          },
        },
      },
      environment: {
        subscription: 'sub-12345',
        location: 'westus2',
        resourceGroup: 'prod-rg',
      },
    });
  });

  it('should handle edge cases where replacements would break JSON structure', () => {
    const content = `{
      "urlWithVariable": "https://@{appsetting('DOMAIN')}.example.com/path",
      "pathWithVariable": "/api/@{appsetting('VERSION')}/endpoint",
      "validReference": "@{appsetting('VALID_VALUE')}"
    }`;

    const appsettings = {
      DOMAIN: 'subdomain',
      VERSION: 'v1',
      VALID_VALUE: 'working-value',
    };

    const result = resolveConnectionsReferences(content, undefined, appsettings);

    // The function properly replaces these patterns as they maintain valid JSON structure
    expect(result).toEqual({
      urlWithVariable: 'https://subdomain.example.com/path',
      pathWithVariable: '/api/v1/endpoint',
      validReference: 'working-value',
    });
  });
});
