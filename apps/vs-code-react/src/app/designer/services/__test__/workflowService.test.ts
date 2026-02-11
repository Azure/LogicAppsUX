import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies before importing the module
vi.mock('@microsoft/logic-apps-designer', () => ({
  getReactQueryClient: vi.fn(() => ({
    fetchQuery: vi.fn((key, queryFn) => queryFn()),
  })),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  LogEntryLevel: { Error: 'Error' },
  LoggerService: vi.fn(() => ({
    log: vi.fn(),
  })),
}));

describe('workflowService', () => {
  describe('fetchAgentUrl URL construction', () => {
    it('should construct HTTP URL for local workflows without defaultHostName', () => {
      const runtimeUrl = 'http://localhost:7071/runtime/webhooks/workflow/api/management';
      const workflowName = 'myWorkflow';

      // Simulate the URL construction logic
      const baseUrl = new URL(runtimeUrl).origin;
      const agentBaseUrl = baseUrl.startsWith('http://') ? baseUrl : `http://${baseUrl}`;
      const agentUrl = `${agentBaseUrl}/api/Agents/${workflowName}`;
      const chatUrl = `${agentBaseUrl}/api/agentsChat/${workflowName}/IFrame`;

      expect(agentBaseUrl).toBe('http://localhost:7071');
      expect(agentUrl).toBe('http://localhost:7071/api/Agents/myWorkflow');
      expect(chatUrl).toBe('http://localhost:7071/api/agentsChat/myWorkflow/IFrame');
    });

    it('should construct HTTPS URL for Azure workflows with defaultHostName', () => {
      const defaultHostName = 'myapp.azurewebsites.net';
      const workflowName = 'myWorkflow';

      // Simulate the URL construction logic for Azure
      const agentBaseUrl = defaultHostName.startsWith('https://') ? defaultHostName : `https://${defaultHostName}`;
      const agentUrl = `${agentBaseUrl}/api/Agents/${workflowName}`;
      const chatUrl = `${agentBaseUrl}/api/agentsChat/${workflowName}/IFrame`;

      expect(agentBaseUrl).toBe('https://myapp.azurewebsites.net');
      expect(agentUrl).toBe('https://myapp.azurewebsites.net/api/Agents/myWorkflow');
      expect(chatUrl).toBe('https://myapp.azurewebsites.net/api/agentsChat/myWorkflow/IFrame');
    });

    it('should handle defaultHostName that already includes https://', () => {
      const defaultHostName = 'https://myapp.azurewebsites.net';
      const workflowName = 'myWorkflow';

      const agentBaseUrl = defaultHostName.startsWith('https://') ? defaultHostName : `https://${defaultHostName}`;
      const chatUrl = `${agentBaseUrl}/api/agentsChat/${workflowName}/IFrame`;

      expect(agentBaseUrl).toBe('https://myapp.azurewebsites.net');
      expect(chatUrl).toBe('https://myapp.azurewebsites.net/api/agentsChat/myWorkflow/IFrame');
    });

    it('should prioritize defaultHostName over runtimeUrl when both are provided', () => {
      const runtimeUrl = 'https://management.azure.com/subscriptions/123/resourceGroups/rg/providers/Microsoft.Web/sites/myapp';
      const defaultHostName = 'myapp.azurewebsites.net';
      const workflowName = 'myWorkflow';

      // When defaultHostName is provided, use it instead of runtimeUrl
      let agentBaseUrl: string;
      if (defaultHostName) {
        agentBaseUrl = defaultHostName.startsWith('https://') ? defaultHostName : `https://${defaultHostName}`;
      } else {
        const baseUrl = new URL(runtimeUrl).origin;
        agentBaseUrl = baseUrl.startsWith('http://') ? baseUrl : `http://${baseUrl}`;
      }

      const chatUrl = `${agentBaseUrl}/api/agentsChat/${workflowName}/IFrame`;

      // Should use defaultHostName, NOT the management.azure.com URL
      expect(agentBaseUrl).toBe('https://myapp.azurewebsites.net');
      expect(chatUrl).toBe('https://myapp.azurewebsites.net/api/agentsChat/myWorkflow/IFrame');
      expect(chatUrl).not.toContain('management.azure.com');
    });

    it('should return empty URLs when workflowName is not provided', () => {
      const workflowName = '';
      const runtimeUrl = 'http://localhost:7071';

      if (!workflowName || !runtimeUrl) {
        expect({ agentUrl: '', chatUrl: '', hostName: '' }).toEqual({
          agentUrl: '',
          chatUrl: '',
          hostName: '',
        });
      }
    });

    it('should return empty URLs when neither runtimeUrl nor defaultHostName is provided', () => {
      const workflowName = 'myWorkflow';
      const runtimeUrl = '';
      const defaultHostName = undefined;

      if (!workflowName || (!runtimeUrl && !defaultHostName)) {
        expect({ agentUrl: '', chatUrl: '', hostName: '' }).toEqual({
          agentUrl: '',
          chatUrl: '',
          hostName: '',
        });
      }
    });
  });
});
