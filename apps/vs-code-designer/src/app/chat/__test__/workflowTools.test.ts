import { describe, it, expect } from 'vitest';
import {
  isValidWorkflowName,
  createWorkflowDefinition,
  resolveProjectPathCandidates,
  isTriggerType,
  buildTriggerDefinition,
  buildActionDefinition,
  detectWeatherManagedApiReference,
  shouldAutoUseWeatherConnector,
  buildSeattleWeatherConnectorAction,
  buildManagedApiConnectionAction,
  resolveManagedApiReferenceName,
  validateApiConnectionReferenceExists,
  selectOperationByActionName,
  resolveSwaggerOperation,
  resolveOfflineManagedConnectorOperation,
  buildServiceProviderAction,
  resolveAppSettingExpressions,
} from '../tools/workflowTools';
import { WorkflowTypeOption } from '../chatConstants';

describe('resolveProjectPathCandidates', () => {
  const projectPaths = ['/workspace/OrderManagement', '/workspace/TonyProject'];

  it('should return all projects when project name is not provided', () => {
    expect(resolveProjectPathCandidates(projectPaths)).toEqual(projectPaths);
  });

  it('should match exact project name case-insensitively', () => {
    expect(resolveProjectPathCandidates(projectPaths, 'tonyproject')).toEqual(['/workspace/TonyProject']);
  });

  it('should match project name with trailing punctuation', () => {
    expect(resolveProjectPathCandidates(projectPaths, 'TonyProject,')).toEqual(['/workspace/TonyProject']);
  });

  it('should match project name when extra context is included', () => {
    expect(resolveProjectPathCandidates(projectPaths, 'TonyProject, Workflow1')).toEqual(['/workspace/TonyProject']);
  });

  it('should return empty result when no project matches', () => {
    expect(resolveProjectPathCandidates(projectPaths, 'ContosoProject')).toEqual([]);
  });
});

describe('isValidWorkflowName', () => {
  describe('valid names', () => {
    it('should accept simple alphabetic name', () => {
      expect(isValidWorkflowName('OrderProcessor')).toBe(true);
    });

    it('should accept name starting with lowercase letter', () => {
      expect(isValidWorkflowName('orderProcessor')).toBe(true);
    });

    it('should accept name with digits', () => {
      expect(isValidWorkflowName('Order123')).toBe(true);
    });

    it('should accept name with underscores', () => {
      expect(isValidWorkflowName('Order_Processor')).toBe(true);
    });

    it('should accept name with hyphens', () => {
      expect(isValidWorkflowName('Order-Processor')).toBe(true);
    });

    it('should accept single letter name', () => {
      expect(isValidWorkflowName('A')).toBe(true);
    });

    it('should accept mixed valid characters', () => {
      expect(isValidWorkflowName('Order_123-Processor')).toBe(true);
    });
  });

  describe('invalid names', () => {
    it('should reject name starting with digit', () => {
      expect(isValidWorkflowName('123Order')).toBe(false);
    });

    it('should reject name starting with underscore', () => {
      expect(isValidWorkflowName('_Order')).toBe(false);
    });

    it('should reject name starting with hyphen', () => {
      expect(isValidWorkflowName('-Order')).toBe(false);
    });

    it('should reject name with spaces', () => {
      expect(isValidWorkflowName('Order Processor')).toBe(false);
    });

    it('should reject name with special characters', () => {
      expect(isValidWorkflowName('Order@Processor')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidWorkflowName('')).toBe(false);
    });

    it('should reject name with dots', () => {
      expect(isValidWorkflowName('Order.Processor')).toBe(false);
    });
  });
});

describe('createWorkflowDefinition', () => {
  describe('workflow kind mapping', () => {
    it('should create stateful workflow with Stateful kind', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateful);
      expect(result.kind).toBe('Stateful');
    });

    it('should create stateless workflow with Stateless kind', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateless);
      expect(result.kind).toBe('Stateless');
    });

    it('should create agentic workflow with Stateful kind', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.agentic);
      expect(result.kind).toBe('Stateful');
    });

    it('should create agent workflow with Stateful kind', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.agent);
      expect(result.kind).toBe('Stateful');
    });
  });

  describe('base definition structure', () => {
    it('should include correct schema', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateful);
      const definition = result.definition as Record<string, unknown>;
      expect(definition.$schema).toBe(
        'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      );
    });

    it('should include correct content version', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateful);
      const definition = result.definition as Record<string, unknown>;
      expect(definition.contentVersion).toBe('1.0.0.0');
    });

    it('should include empty triggers object', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateful);
      const definition = result.definition as Record<string, unknown>;
      expect(definition.triggers).toEqual({});
    });

    it('should include empty actions object', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateful);
      const definition = result.definition as Record<string, unknown>;
      expect(definition.actions).toEqual({});
    });

    it('should include empty outputs object', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateful);
      const definition = result.definition as Record<string, unknown>;
      expect(definition.outputs).toEqual({});
    });
  });

  describe('description handling', () => {
    it('should add description when provided', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateful, 'Process customer orders');
      const definition = result.definition as Record<string, unknown>;
      expect(definition.description).toBe('Process customer orders');
    });

    it('should not add description when not provided', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateful);
      const definition = result.definition as Record<string, unknown>;
      expect(definition.description).toBeUndefined();
    });
  });

  describe('agentic workflow metadata', () => {
    it('should add metadata for agentic workflows', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.agentic);
      expect(result.metadata).toEqual({
        workflowType: 'agentic',
        aiEnabled: true,
      });
    });

    it('should add metadata for agent workflows', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.agent);
      expect(result.metadata).toEqual({
        workflowType: 'agent',
        aiEnabled: true,
      });
    });

    it('should not add metadata for stateful workflows', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateful);
      expect(result.metadata).toBeUndefined();
    });

    it('should not add metadata for stateless workflows', () => {
      const result = createWorkflowDefinition(WorkflowTypeOption.stateless);
      expect(result.metadata).toBeUndefined();
    });
  });
});

describe('trigger/action definitions', () => {
  it('treats Request as a trigger type', () => {
    expect(isTriggerType('Request')).toBe(true);
    expect(isTriggerType('request')).toBe(true);
  });

  it('does not treat Http as a trigger type', () => {
    expect(isTriggerType('Http')).toBe(false);
  });

  it('builds Request trigger definition in trigger shape', () => {
    const trigger = buildTriggerDefinition('Request', {
      type: 'Request',
      kind: 'Http',
      inputs: {
        method: 'GET',
      },
    });

    expect(trigger).toEqual({
      type: 'Request',
      kind: 'Http',
      inputs: {
        method: 'GET',
      },
    });
  });

  it('builds action definition with runAfter for non-trigger operations', () => {
    const action = buildActionDefinition('Http', {
      method: 'GET',
      uri: 'https://example.com',
    });

    expect(action).toEqual({
      type: 'Http',
      inputs: {
        method: 'GET',
        uri: 'https://example.com',
      },
      runAfter: {},
    });
  });

  it('normalizes runAfter from nested inputs to top-level action property', () => {
    const action = buildActionDefinition('Response', {
      type: 'Response',
      inputs: {
        statusCode: 200,
        runAfter: {
          Get_Seattle_Weather: ['Succeeded'],
        },
      },
    });

    expect(action).toEqual({
      type: 'Response',
      inputs: {
        statusCode: 200,
      },
      runAfter: {
        Get_Seattle_Weather: ['Succeeded'],
      },
    });
  });

  it('detects weather managed connection reference from connections data', () => {
    const reference = detectWeatherManagedApiReference({
      managedApiConnections: {
        myWeatherConn: {
          api: {
            id: '/subscriptions/abc/providers/Microsoft.Web/locations/westus/managedApis/msnweather',
          },
        },
      },
    });

    expect(reference).toBe('myWeatherConn');
  });

  it('returns undefined when no weather connector is found', () => {
    const reference = detectWeatherManagedApiReference({
      managedApiConnections: {
        office365: {
          api: {
            id: '/managedApis/office365',
          },
        },
        sql: {
          api: {
            id: '/managedApis/sql',
          },
        },
      },
    });

    expect(reference).toBeUndefined();
  });

  it('returns undefined when weather-like reference is missing api.id', () => {
    const reference = detectWeatherManagedApiReference({
      managedApiConnections: {
        msweather: {
          connection: {
            id: '/connections/msweather',
          },
        },
      },
    });

    expect(reference).toBeUndefined();
  });

  it('detects weather intent for HTTP actions', () => {
    expect(
      shouldAutoUseWeatherConnector('Http', 'Get_Seattle_Weather', {
        uri: 'https://api.open-meteo.com/v1/forecast?latitude=47.6062&longitude=-122.3321&current_weather=true',
      })
    ).toBe(true);
  });

  it('detects weather intent for ApiConnection actions too', () => {
    expect(shouldAutoUseWeatherConnector('ApiConnection', 'Get_Seattle_Weather', {})).toBe(true);
  });

  it('does not detect weather intent for unrelated ApiConnection actions', () => {
    expect(
      shouldAutoUseWeatherConnector('ApiConnection', 'Send_Email', {
        path: '/v2/Mail',
      })
    ).toBe(false);
  });

  it('does not detect weather intent for SQL ApiConnection actions', () => {
    expect(
      shouldAutoUseWeatherConnector('ApiConnection', 'Query_SQL_Orders', {
        path: '/v2/datasets/default/tables/Orders/items',
      })
    ).toBe(false);
  });

  it('does not detect weather intent for Service Bus ApiConnection actions', () => {
    expect(
      shouldAutoUseWeatherConnector('ApiConnection', 'Send_ServiceBus_Message', {
        path: "/@{encodeURIComponent('orders')}/messages",
      })
    ).toBe(false);
  });

  it('detects weather intent when URI is nested under inputs', () => {
    expect(
      shouldAutoUseWeatherConnector('Http', 'Get_Seattle_Weather', {
        inputs: {
          uri: 'https://api.open-meteo.com/v1/forecast?latitude=47.6062&longitude=-122.3321&current_weather=true',
        },
      })
    ).toBe(true);
  });

  it('builds canonical Seattle weather connector action', () => {
    const action = buildSeattleWeatherConnectorAction('msnweather');

    expect(action).toEqual({
      type: 'ApiConnection',
      inputs: {
        host: {
          connection: {
            referenceName: 'msnweather',
          },
        },
        method: 'get',
        path: "/current/@{encodeURIComponent('98101')}",
        queries: {
          units: 'I',
        },
      },
      runAfter: {},
    });
  });

  it('builds generic managed ApiConnection action for SQL', () => {
    const action = buildManagedApiConnectionAction('sql', 'GET', '/v2/datasets/default/tables/Orders/items', {
      inputs: {
        queries: {
          $top: 10,
        },
      },
    });

    expect(action).toEqual({
      type: 'ApiConnection',
      inputs: {
        host: {
          connection: {
            referenceName: 'sql',
          },
        },
        method: 'get',
        path: '/v2/datasets/default/tables/Orders/items',
        queries: {
          $top: 10,
        },
      },
      runAfter: {},
    });
  });

  it('resolves managed connector reference case-insensitively', () => {
    const resolved = resolveManagedApiReferenceName('SQL', ['sql', 'servicebus']);
    expect(resolved).toBe('sql');
  });

  it('validates ApiConnection reference for SQL/Service Bus references', () => {
    const sqlValidation = validateApiConnectionReferenceExists(
      {
        host: {
          connection: {
            referenceName: 'sql',
          },
        },
      },
      ['sql', 'servicebus']
    );

    const sbValidation = validateApiConnectionReferenceExists(
      {
        host: {
          connection: {
            referenceName: 'servicebus',
          },
        },
      },
      ['sql', 'servicebus']
    );

    expect(sqlValidation).toBeUndefined();
    expect(sbValidation).toBeUndefined();
  });

  it('returns reference validation error when connector is missing', () => {
    const validationError = validateApiConnectionReferenceExists(
      {
        host: {
          connection: {
            referenceName: 'sql',
          },
        },
      },
      ['servicebus']
    );

    expect(validationError).toContain('ApiConnection reference "sql" could not be resolved');
    expect(validationError).toContain('Valid managed connection references with api.id: servicebus');
  });

  it('ranks operation candidates to prefer specific row retrieval over list operations', () => {
    const selected = selectOperationByActionName('Get SQL row by id', [
      {
        name: 'Get_rows_V2',
        properties: {
          summary: 'List all rows in table',
          swaggerOperationId: 'GetItems_V2',
        },
      },
      {
        name: 'Get_row_V2',
        properties: {
          summary: 'Get a single row by key',
          swaggerOperationId: 'GetItem_V2',
        },
      },
    ]);

    expect(selected?.name).toBe('Get_row_V2');
  });

  it('uses operationId hint to rank service bus send operation above receive', () => {
    const selected = selectOperationByActionName(
      'Send Service Bus message',
      [
        {
          name: 'ReceiveMessages',
          properties: {
            summary: 'Receive messages from queue',
            swaggerOperationId: 'ReceiveMessages',
          },
        },
        {
          name: 'SendMessage',
          properties: {
            summary: 'Send a message to queue',
            swaggerOperationId: 'SendMessage',
          },
        },
      ],
      {
        operationId: 'sendmessage',
      }
    );

    expect(selected?.name).toBe('SendMessage');
  });

  it('ranks swagger operation candidates using action intent when method/path is not provided', () => {
    const resolved = resolveSwaggerOperation(
      {
        paths: {
          '/messages': {
            get: {
              operationId: 'GetMessages',
              summary: 'Get messages from queue',
            },
            post: {
              operationId: 'SendMessage',
              summary: 'Send message to queue',
            },
          },
        },
      },
      'Send Service Bus message',
      [],
      {}
    );

    expect(resolved).toEqual({
      method: 'post',
      path: '/messages',
      operationId: 'SendMessage',
    });
  });

  it('prefers explicit method/path hints when ranking swagger operation candidates', () => {
    const resolved = resolveSwaggerOperation(
      {
        paths: {
          '/messages': {
            get: {
              operationId: 'GetMessages',
              summary: 'Get messages from queue',
            },
            post: {
              operationId: 'SendMessage',
              summary: 'Send message to queue',
            },
          },
        },
      },
      'Send Service Bus message',
      ['SendMessage'],
      {
        method: 'get',
        path: '/messages',
      }
    );

    expect(resolved).toEqual({
      method: 'get',
      path: '/messages',
      operationId: 'GetMessages',
    });
  });

  it('prefers SQL list operation for list intent', () => {
    const selected = selectOperationByActionName('List SQL rows in Orders table', [
      {
        name: 'Get_row_V2',
        properties: {
          summary: 'Get a single row by key',
          swaggerOperationId: 'GetItem_V2',
        },
      },
      {
        name: 'Get_rows_V2',
        properties: {
          summary: 'List all rows in a table',
          swaggerOperationId: 'GetItems_V2',
        },
      },
    ]);

    expect(selected?.name).toBe('Get_rows_V2');
  });

  it('prefers SQL single-item swagger path for by-id intent', () => {
    const resolved = resolveSwaggerOperation(
      {
        paths: {
          '/v2/tables/orders/items': {
            get: {
              operationId: 'GetItems_V2',
              summary: 'List rows',
            },
          },
          '/v2/tables/orders/items/{id}': {
            get: {
              operationId: 'GetItem_V2',
              summary: 'Get row by id',
            },
          },
        },
      },
      'Get SQL row by id',
      [],
      {}
    );

    expect(resolved).toEqual({
      method: 'get',
      path: '/v2/tables/orders/items/{id}',
      operationId: 'GetItem_V2',
    });
  });

  it('prefers Service Bus receive operation when send and receive share method', () => {
    const resolved = resolveSwaggerOperation(
      {
        paths: {
          '/queues/{queueName}/messages/send': {
            post: {
              operationId: 'SendMessage',
              summary: 'Send message to queue',
            },
          },
          '/queues/{queueName}/messages/receive': {
            post: {
              operationId: 'ReceiveMessages',
              summary: 'Receive messages from queue',
            },
          },
        },
      },
      'Receive Service Bus messages',
      [],
      {}
    );

    expect(resolved).toEqual({
      method: 'post',
      path: '/queues/{queueName}/messages/receive',
      operationId: 'ReceiveMessages',
    });
  });

  it('prefers Service Bus peek-lock operation for peek intent', () => {
    const resolved = resolveSwaggerOperation(
      {
        paths: {
          '/queues/{queueName}/messages/send': {
            post: {
              operationId: 'SendMessage',
              summary: 'Send message to queue',
            },
          },
          '/queues/{queueName}/messages/receive': {
            post: {
              operationId: 'ReceiveMessages',
              summary: 'Receive messages from queue',
            },
          },
          '/queues/{queueName}/messages/peeklock': {
            post: {
              operationId: 'PeekLockMessages',
              summary: 'Peek-lock messages from queue',
            },
          },
        },
      },
      'Peek Service Bus messages',
      [],
      {}
    );

    expect(resolved).toEqual({
      method: 'post',
      path: '/queues/{queueName}/messages/peeklock',
      operationId: 'PeekLockMessages',
    });
  });

  it('normalizes connector swagger paths that include {connectionId} prefix', () => {
    const resolved = resolveSwaggerOperation(
      {
        paths: {
          '/{connectionId}/v2/datasets/{dataset}/tables/{table}/items': {
            get: {
              operationId: 'GetItems_V2',
              summary: 'List rows',
            },
          },
        },
      },
      'List SQL rows',
      ['GetItems_V2'],
      {}
    );

    expect(resolved).toEqual({
      method: 'get',
      path: '/v2/datasets/{dataset}/tables/{table}/items',
      operationId: 'GetItems_V2',
    });
  });

  it('resolves offline SQL list operation to canonical encoded path', () => {
    const resolved = resolveOfflineManagedConnectorOperation(
      '/subscriptions/abc/providers/Microsoft.Web/locations/westus/managedApis/sql',
      'List SQL Orders',
      {}
    );

    expect(resolved).toEqual({
      method: 'get',
      path: "/v2/datasets/@{encodeURIComponent(encodeURIComponent('default'))},@{encodeURIComponent(encodeURIComponent('default'))}/tables/@{encodeURIComponent(encodeURIComponent('[dbo].[Orders]'))}/items",
      operationId: 'GetItems_V2',
    });
  });

  it('normalizes plain SQL path hint in offline fallback', () => {
    const resolved = resolveOfflineManagedConnectorOperation(
      '/subscriptions/abc/providers/Microsoft.Web/locations/westus/managedApis/sql',
      'List SQL Orders',
      {
        method: 'GET',
        path: '/v2/datasets/default/tables/[dbo].[Orders]/items',
      }
    );

    expect(resolved).toEqual({
      method: 'get',
      path: "/v2/datasets/@{encodeURIComponent(encodeURIComponent('default'))},@{encodeURIComponent(encodeURIComponent('default'))}/tables/@{encodeURIComponent(encodeURIComponent('[dbo].[Orders]'))}/items",
      operationId: 'GetItems_V2',
    });
  });

  it('builds ServiceProvider action with correct shape', () => {
    const action = buildServiceProviderAction('AzureBlob', 'readBlob', '/serviceProviders/AzureBlob', {
      containerName: 'container1',
      blobName: 'blob1',
    });

    expect(action).toEqual({
      type: 'ServiceProvider',
      inputs: {
        parameters: {
          containerName: 'container1',
          blobName: 'blob1',
        },
        serviceProviderConfiguration: {
          connectionName: 'AzureBlob',
          operationId: 'readBlob',
          serviceProviderId: '/serviceProviders/AzureBlob',
        },
      },
      runAfter: {},
    });
  });

  it('builds ServiceProvider action with custom runAfter', () => {
    const action = buildServiceProviderAction(
      'serviceBus',
      'sendMessage',
      '/serviceProviders/serviceBus',
      { message: 'hello' },
      { Previous_Action: ['Succeeded'] }
    );

    expect(action.type).toBe('ServiceProvider');
    expect((action.inputs as any).serviceProviderConfiguration.connectionName).toBe('serviceBus');
    expect((action.inputs as any).serviceProviderConfiguration.operationId).toBe('sendMessage');
    expect(action.runAfter).toEqual({ Previous_Action: ['Succeeded'] });
  });

  it('builds ServiceProvider action with empty parameters when none provided', () => {
    const action = buildServiceProviderAction('AzureBlob', 'readBlob', '/serviceProviders/AzureBlob');
    expect((action.inputs as any).parameters).toEqual({});
    expect(action.runAfter).toEqual({});
  });

  it('resolves @appsetting() expressions in api.id paths', () => {
    const input =
      "/subscriptions/@appsetting('WORKFLOWS_SUBSCRIPTION_ID')/providers/Microsoft.Web/locations/@appsetting('WORKFLOWS_LOCATION_NAME')/managedApis/office365";
    const result = resolveAppSettingExpressions(input, {
      WORKFLOWS_SUBSCRIPTION_ID: 'abc-123',
      WORKFLOWS_LOCATION_NAME: 'westus',
    });
    expect(result).toBe('/subscriptions/abc-123/providers/Microsoft.Web/locations/westus/managedApis/office365');
  });

  it('leaves @appsetting() expressions unresolved when values are missing', () => {
    const input =
      "/subscriptions/@appsetting('WORKFLOWS_SUBSCRIPTION_ID')/providers/Microsoft.Web/locations/@appsetting('WORKFLOWS_LOCATION_NAME')/managedApis/sql";
    const result = resolveAppSettingExpressions(input, {});
    expect(result).toBe(input);
  });

  it('returns string unchanged when no @appsetting() expressions are present', () => {
    const input = '/subscriptions/abc-123/providers/Microsoft.Web/locations/westus/managedApis/sql';
    const result = resolveAppSettingExpressions(input, { WORKFLOWS_SUBSCRIPTION_ID: 'other' });
    expect(result).toBe(input);
  });
});
