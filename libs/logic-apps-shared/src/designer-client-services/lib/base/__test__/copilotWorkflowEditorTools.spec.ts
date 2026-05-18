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

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['send email via outlook'] }));
      const parsed = JSON.parse(result);

      expect(mockSearchService.getActiveSearchOperations).toHaveBeenCalledWith('send email via outlook');
      expect(parsed['send email via outlook']).toBeDefined();
      expect(parsed['send email via outlook']).toHaveLength(1);
      expect(parsed['send email via outlook'][0].connectorId).toBe('/connectors/outlook');
      expect(parsed['send email via outlook'][0].connectorName).toBe('Office 365 Outlook');
    });

    it('should return matching operations as summaries on the connector', async () => {
      const ops = [
        makeOperation('SendEmail', '/connectors/outlook', 'Office 365 Outlook', 'Send an email'),
        makeOperation('GetEmails', '/connectors/outlook', 'Office 365 Outlook', 'Get emails'),
      ];
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['email'] }));
      const parsed = JSON.parse(result);

      const connector = parsed['email'][0];
      expect(connector.connectorId).toBe('/connectors/outlook');
      expect(connector.matchingOperations).toContain('Send an email');
      expect(connector.matchingOperations).toContain('Get emails');
    });

    it('should fall back to getBuiltInOperations and filter when getActiveSearchOperations is unavailable', async () => {
      delete mockSearchService.getActiveSearchOperations;
      const builtInOps = [
        makeOperation('SendEmail', '/connectors/outlook', 'Outlook', 'Send an email'),
        makeOperation('GetRows', '/connectors/sql', 'SQL Server', 'Get rows from table'),
      ];
      mockSearchService.getBuiltInOperations = vi.fn().mockResolvedValue(builtInOps);

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['email'] }));
      const parsed = JSON.parse(result);

      expect(parsed['email']).toBeDefined();
      // Should find the Outlook connector via name/description/summary matching
      expect(parsed['email'].some((c: any) => c.connectorName === 'Outlook')).toBe(true);
    });

    it('should return message when no operations match', async () => {
      mockSearchService.getActiveSearchOperations.mockResolvedValue([]);

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['nonexistent capability'] }));
      const parsed = JSON.parse(result);

      expect(parsed['nonexistent capability'].message).toContain('No connectors found');
    });

    it('should group operations by connector and deduplicate', async () => {
      const ops = [
        makeOperation('SendEmail', '/connectors/outlook', 'Office 365 Outlook', 'Send an email'),
        makeOperation('GetEmails', '/connectors/outlook', 'Office 365 Outlook', 'Get emails'),
        makeOperation('GetRows', '/connectors/sql', 'SQL Server', 'Get rows from table'),
      ];
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['data'] }));
      const parsed = JSON.parse(result);

      // Should return 2 connectors, not 3 operations
      expect(parsed['data']).toHaveLength(2);
      expect(parsed['data'][0].connectorId).toBe('/connectors/outlook');
      expect(parsed['data'][1].connectorId).toBe('/connectors/sql');
    });

    it('should not fetch swagger (no action templates in discover)', async () => {
      const ops = [makeOperation('SendEmail', '/connectors/outlook', 'Office 365 Outlook')];
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);

      await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['send email'] }));

      // discover_connectors should NOT call getSwaggerFromConnector
      expect(mockConnectionService.getSwaggerFromConnector).not.toHaveBeenCalled();
    });

    it('should limit results to top 5 connectors per capability', async () => {
      const ops = Array.from({ length: 20 }, (_, i) => makeOperation(`Op${i}`, `/connectors/conn${i}`, `Connector ${i}`, `Operation ${i}`));
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['test capability'] }));
      const parsed = JSON.parse(result);

      expect(parsed['test capability'].length).toBeLessThanOrEqual(5);
    });

    it('should limit matching operations per connector to 5', async () => {
      const ops = Array.from({ length: 10 }, (_, i) => makeOperation(`Op${i}`, '/connectors/test', 'Test Connector', `Operation ${i}`));
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['test'] }));
      const parsed = JSON.parse(result);

      expect(parsed['test'][0].matchingOperations.length).toBeLessThanOrEqual(5);
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

    it('should return no results when getOperationsByConnector is unavailable', async () => {
      delete mockSearchService.getOperationsByConnector;
      mockConnectionService.getSwaggerFromConnector.mockRejectedValue(new Error('no swagger'));

      const result = await executeCopilotTool('get_connector_operations', JSON.stringify({ connectorId: '/connectors/outlook' }));
      const parsed = JSON.parse(result);

      expect(parsed.results).toHaveLength(0);
      expect(parsed.message).toBeDefined();
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

  // ── re-ranking ─────────────────────────────────────────────────────────
  describe('discover_connectors re-ranking', () => {
    it('should boost connectors whose name matches search terms', async () => {
      // Simulate the real-world issue: searching "outlook email" returns irrelevant connectors first
      const ops = [
        makeOperation('scp-get-email-insights', '/connectors/contosohub', 'Contoso Hub', 'Enrich email summary'),
        makeOperation('scp-get-email-summary', '/connectors/docusign', 'Docusign', 'Get email summary'),
        makeOperation('FormatEmailGet', '/connectors/dqondemand', 'DQ on Demand', 'Format Email'),
        makeOperation('MSOutlookCloseInstance', '/connectors/iaconnect', 'IA-Connect to Microsoft Office', 'Close MS Outlook instance'),
        makeOperation('SendEmailV2', '/connectors/office365', 'Office 365 Outlook', 'Send an email (V2)'),
        makeOperation('OnNewEmail', '/connectors/office365', 'Office 365 Outlook', 'When a new email arrives'),
      ];
      mockSearchService.getActiveSearchOperations.mockResolvedValue(ops);

      const result = await executeCopilotTool('discover_connectors', JSON.stringify({ capabilities: ['outlook email'] }));
      const parsed = JSON.parse(result);

      const connectors = parsed['outlook email'];
      expect(connectors).toBeDefined();
      // Office 365 Outlook should be the first connector because "outlook" matches the connector name
      expect(connectors[0].connectorName).toBe('Office 365 Outlook');
      expect(connectors[0].connectorId).toBe('/connectors/office365');
    });
  });
});
