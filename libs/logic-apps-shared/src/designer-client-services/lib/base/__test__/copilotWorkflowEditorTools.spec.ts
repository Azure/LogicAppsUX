import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCopilotTool, COPILOT_WORKFLOW_TOOLS } from '../copilot/copilotWorkflowEditorTools';

// ---------------------------------------------------------------------------
// Mock the service singletons used by the tool handlers
// ---------------------------------------------------------------------------
let mockSearchService: Record<string, any>;
let mockConnectionService: Record<string, any>;

function resetMockServices() {
  mockSearchService = {
    getAllOperations: vi.fn(),
    getActiveSearchOperations: vi.fn(),
    getOperationsByConnector: vi.fn(),
  };
  mockConnectionService = {
    getSwaggerFromConnector: vi.fn(),
  };
}

vi.mock('../../search', () => ({
  SearchService: vi.fn(() => mockSearchService),
}));

vi.mock('../../connection', () => ({
  ConnectionService: vi.fn(() => mockConnectionService),
}));

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------
function makeOperation(name: string, connectorId: string, connectorName: string, summary?: string) {
  return {
    name,
    id: `${connectorId}/operations/${name}`,
    properties: {
      summary: summary ?? `${name} summary`,
      description: `${name} description`,
      api: {
        id: connectorId,
        name: connectorName,
        displayName: connectorName,
      },
      swaggerOperationId: name,
    },
  };
}

function makeSwaggerDoc(paths: Record<string, any> = {}): any {
  return {
    swagger: '2.0',
    info: { title: 'Test', version: '1.0' },
    paths,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('COPILOT_WORKFLOW_TOOLS', () => {
  it('should define discover_connectors tool', () => {
    const tool = COPILOT_WORKFLOW_TOOLS.find((t) => t.function.name === 'discover_connectors');
    expect(tool).toBeDefined();
    expect(tool?.function.parameters.required).toContain('capabilities');
  });

  it('should define get_connector_operations tool', () => {
    const tool = COPILOT_WORKFLOW_TOOLS.find((t) => t.function.name === 'get_connector_operations');
    expect(tool).toBeDefined();
    expect(tool?.function.parameters.required).toContain('connectorId');
  });

  it('should have valid function-calling format for all tools', () => {
    for (const tool of COPILOT_WORKFLOW_TOOLS) {
      expect(tool.type).toBe('function');
      expect(tool.function.name).toBeTruthy();
      expect(tool.function.description).toBeTruthy();
      expect(tool.function.parameters.type).toBe('object');
    }
  });
});

describe('executeCopilotTool', () => {
  beforeEach(() => {
    resetMockServices();
    vi.clearAllMocks();
  });

  it('should return an error for unknown tools', async () => {
    const result = await executeCopilotTool('nonexistent_tool', '{}');
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('Unknown tool');
  });

  it('should return an error for invalid JSON arguments', async () => {
    const result = await executeCopilotTool('discover_connectors', 'not valid json');
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('Invalid JSON');
  });

  // ── discover_connectors ────────────────────────────────────────────────
  describe('discover_connectors', () => {
    it('should return an error when no capabilities provided', async () => {
      const result = await executeCopilotTool('discover_connectors', JSON.stringify({}));
      const parsed = JSON.parse(result);
      expect(parsed.error).toContain('capability');
    });

    it('should return an error for empty capabilities array', async () => {
      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: [] }));
      const parsed = JSON.parse(result);
      expect(parsed.error).toContain('capability');
    });

    it('should search using getActiveSearchOperations when available', async () => {
      const ops = [makeOperation('SendEmail', '/connectors/outlook', 'Office 365 Outlook', 'Send an email')];
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);
      mockConnectionService.getSwaggerFromConnector.mockRejectedValue(new Error('no swagger'));

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['send email via outlook'] }));
      const parsed = JSON.parse(result);

      expect(mockSearchService.getActiveSearchOperations).toHaveBeenCalledWith('send email via outlook');
      expect(parsed['send email via outlook']).toBeDefined();
      expect(parsed['send email via outlook']).toHaveLength(1);
      expect(parsed['send email via outlook'][0].operationId).toBe('SendEmail');
    });

    it('should fall back to getAllOperations and filter when getActiveSearchOperations is unavailable', async () => {
      delete mockSearchService.getActiveSearchOperations;
      const allOps = [
        makeOperation('SendEmail', '/connectors/outlook', 'Outlook', 'Send an email'),
        makeOperation('GetRows', '/connectors/sql', 'SQL Server', 'Get rows from table'),
      ];
      mockSearchService.getAllOperations.mockResolvedValue(allOps);
      mockConnectionService.getSwaggerFromConnector.mockRejectedValue(new Error('no swagger'));

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['email'] }));
      const parsed = JSON.parse(result);

      expect(parsed['email']).toBeDefined();
      // Should find the email operation via name/description/summary matching
      expect(parsed['email'].some((op: any) => op.operationId === 'SendEmail')).toBe(true);
    });

    it('should return message when no operations match', async () => {
      mockSearchService.getActiveSearchOperations.mockResolvedValue([]);

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['nonexistent capability'] }));
      const parsed = JSON.parse(result);

      expect(parsed['nonexistent capability'].message).toContain('No operations found');
    });

    it('should build action templates when swagger is available', async () => {
      const ops = [makeOperation('SendEmail', '/connectors/outlook', 'Office 365 Outlook')];
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);
      mockConnectionService.getSwaggerFromConnector.mockResolvedValue(
        makeSwaggerDoc({
          '/{connectionId}/v2/Mail': {
            post: {
              operationId: 'SendEmail',
              summary: 'Send an email',
              parameters: [
                { name: 'connectionId', in: 'path', required: true, type: 'string' },
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    properties: {
                      To: { type: 'string', description: 'Recipients' },
                      Subject: { type: 'string', description: 'Email subject' },
                    },
                  },
                },
              ],
            },
          },
        })
      );

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['send email'] }));
      const parsed = JSON.parse(result);

      const template = parsed['send email'][0];
      expect(template.actionDefinition).toBeDefined();
      expect(template.actionDefinition.type).toBe('ApiConnection');
      expect(template.actionDefinition.inputs.method).toBe('post');
      // Connection ID prefix should be stripped from path
      expect(template.actionDefinition.inputs.path).toBe('/v2/Mail');
      expect(template.actionDefinition.inputs.host.connection.referenceName).toBeTruthy();
      expect(template.actionDefinition.inputs.body).toBeDefined();
      expect(template.inputDescriptions).toBeDefined();
    });

    it('should strip {connectionId} from swagger paths', async () => {
      const ops = [makeOperation('GetItem', '/connectors/sharepoint', 'SharePoint')];
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);
      mockConnectionService.getSwaggerFromConnector.mockResolvedValue(
        makeSwaggerDoc({
          '/{connectionId}/datasets/{dataset}/tables/{table}/items/{id}': {
            get: {
              operationId: 'GetItem',
              parameters: [
                { name: 'connectionId', in: 'path', type: 'string' },
                { name: 'dataset', in: 'path', type: 'string', description: 'Site URL' },
                { name: 'table', in: 'path', type: 'string', description: 'List name' },
                { name: 'id', in: 'path', type: 'string', description: 'Item ID' },
              ],
            },
          },
        })
      );

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['get sharepoint item'] }));
      const parsed = JSON.parse(result);

      const template = parsed['get sharepoint item'][0];
      // {connectionId} should be removed
      expect(template.actionDefinition.inputs.path).not.toContain('connectionId');
      // Other path params should be parameterized
      expect(template.actionDefinition.inputs.path).toContain("@{encodeURIComponent('");
    });

    it('should include query parameters in the template', async () => {
      const ops = [makeOperation('ListItems', '/connectors/sharepoint', 'SharePoint')];
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);
      mockConnectionService.getSwaggerFromConnector.mockResolvedValue(
        makeSwaggerDoc({
          '/{connectionId}/items': {
            get: {
              operationId: 'ListItems',
              parameters: [
                { name: 'connectionId', in: 'path', type: 'string' },
                { name: '$filter', in: 'query', type: 'string', description: 'OData filter' },
                { name: '$top', in: 'query', type: 'integer', description: 'Number of items' },
              ],
            },
          },
        })
      );

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['list items'] }));
      const parsed = JSON.parse(result);

      const template = parsed['list items'][0];
      expect(template.actionDefinition.inputs.queries).toBeDefined();
      expect(template.actionDefinition.inputs.queries['$filter']).toBeDefined();
      expect(template.actionDefinition.inputs.queries['$top']).toBeDefined();
    });

    it('should handle swagger fetch failures gracefully', async () => {
      const ops = [makeOperation('Op1', '/connectors/test', 'Test Connector')];
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);
      mockConnectionService.getSwaggerFromConnector.mockRejectedValue(new Error('network error'));

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['test'] }));
      const parsed = JSON.parse(result);

      // Should still return results, just without actionDefinition
      expect(parsed['test']).toBeDefined();
      expect(parsed['test'][0].operationId).toBe('Op1');
      expect(parsed['test'][0].note).toContain('Swagger not available');
    });

    it('should limit results to top 5 operations per capability', async () => {
      const ops = Array.from({ length: 10 }, (_, i) => makeOperation(`Op${i}`, '/connectors/test', 'Test', `Operation ${i}`));
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);
      mockConnectionService.getSwaggerFromConnector.mockRejectedValue(new Error('no swagger'));

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['test capability'] }));
      const parsed = JSON.parse(result);

      expect(parsed['test capability'].length).toBeLessThanOrEqual(5);
    });
  });

  // ── get_connector_operations ────────────────────────────────────────────
  describe('get_connector_operations', () => {
    it('should use getOperationsByConnector when available', async () => {
      const ops = [makeOperation('Op1', '/connectors/outlook', 'Outlook'), makeOperation('Op2', '/connectors/outlook', 'Outlook')];
      mockSearchService.getOperationsByConnector.mockResolvedValue(ops);
      mockConnectionService.getSwaggerFromConnector.mockRejectedValue(new Error('no swagger'));

      const result = await executeCopilotTool('get_connector_operations', JSON.stringify({ connectorId: '/connectors/outlook' }));
      const parsed = JSON.parse(result);

      expect(parsed.results).toHaveLength(2);
    });

    it('should fall back to filtering getAllOperations when getOperationsByConnector is unavailable', async () => {
      delete mockSearchService.getOperationsByConnector;
      const allOps = [makeOperation('Op1', '/connectors/outlook', 'Outlook'), makeOperation('Op2', '/connectors/sql', 'SQL')];
      mockSearchService.getAllOperations.mockResolvedValue(allOps);
      mockConnectionService.getSwaggerFromConnector.mockRejectedValue(new Error('no swagger'));

      const result = await executeCopilotTool('get_connector_operations', JSON.stringify({ connectorId: '/connectors/outlook' }));
      const parsed = JSON.parse(result);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].operationId).toBe('Op1');
    });

    it('should return a message when no operations found', async () => {
      mockSearchService.getOperationsByConnector.mockResolvedValue([]);

      const result = await executeCopilotTool('get_connector_operations', JSON.stringify({ connectorId: '/connectors/nonexistent' }));
      const parsed = JSON.parse(result);

      expect(parsed.results).toEqual([]);
      expect(parsed.message).toContain('No operations found');
    });

    it('should build action templates with swagger for connector operations', async () => {
      const ops = [makeOperation('SendEmail', '/connectors/outlook', 'Office 365 Outlook')];
      mockSearchService.getOperationsByConnector.mockResolvedValue(ops);
      mockConnectionService.getSwaggerFromConnector.mockResolvedValue(
        makeSwaggerDoc({
          '/{connectionId}/v2/Mail': {
            post: {
              operationId: 'SendEmail',
              summary: 'Send email',
              parameters: [{ name: 'connectionId', in: 'path', type: 'string' }],
            },
          },
        })
      );

      const result = await executeCopilotTool('get_connector_operations', JSON.stringify({ connectorId: '/connectors/outlook' }));
      const parsed = JSON.parse(result);

      expect(parsed.results[0].actionDefinition).toBeDefined();
      expect(parsed.results[0].actionDefinition.type).toBe('ApiConnection');
    });

    it('should handle errors gracefully', async () => {
      mockSearchService.getOperationsByConnector.mockRejectedValue(new Error('Service unavailable'));

      const result = await executeCopilotTool('get_connector_operations', JSON.stringify({ connectorId: '/connectors/test' }));
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain('Failed to list operations');
    });
  });
});
