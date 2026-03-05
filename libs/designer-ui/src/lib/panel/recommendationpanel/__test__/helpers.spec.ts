import { describe, test, expect, vi } from 'vitest';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { getOperationCardDataFromOperation } from '../helpers';

vi.mock('../../../connectors', () => ({
  isBuiltInConnector: vi.fn((api) => api.id?.startsWith('connectionProviders/') ?? false),
  isCustomConnector: vi.fn((api) => api.id?.includes('/custom/') ?? false),
}));

vi.mock('../../../utils', () => ({
  getConnectorCategoryString: vi.fn(() => 'Built-in'),
}));

describe('helpers', () => {
  describe('getOperationCardDataFromOperation', () => {
    test('should extract correct properties from operation', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'test-op',
        name: 'testop',
        type: 'Test',
        properties: {
          summary: 'Test Operation',
          description: 'Test Description',
          operationType: 'Http',
          api: {
            id: 'connectionProviders/http',
            name: 'http',
            displayName: 'HTTP',
            brandColor: '#0078D4',
            iconUri: 'https://example.com/http-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.id).toBe('test-op');
      expect(result.title).toBe('Test Operation');
      expect(result.description).toBe('Test Description');
      expect(result.brandColor).toBe('#0078D4');
      expect(result.iconUri).toBe('https://example.com/http-icon.svg');
      expect(result.connectorName).toBe('HTTP');
      expect(result.apiId).toBe('connectionProviders/http');
    });

    test('should append (MCP) suffix for McpClientTool operations', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'mcp-tool',
        name: 'mcptool',
        type: 'McpClientTool',
        properties: {
          summary: 'MCP Tool',
          description: 'MCP Description',
          operationType: 'McpClientTool',
          api: {
            id: 'connectionProviders/mcpclient',
            name: 'mcpclient',
            displayName: 'MCP Client',
            brandColor: '#000000',
            iconUri: 'https://example.com/mcp-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.title).toBe('MCP Tool (MCP)');
    });

    test('should not append (MCP) suffix for non-MCP operations', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'http-op',
        name: 'http',
        type: 'Http',
        properties: {
          summary: 'HTTP Request',
          description: 'Make HTTP request',
          operationType: 'Http',
          api: {
            id: 'connectionProviders/http',
            name: 'http',
            displayName: 'HTTP',
            brandColor: '#0078D4',
            iconUri: 'https://example.com/http-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.title).toBe('HTTP Request');
      expect(result.title).not.toContain('(MCP)');
    });

    test('should set isTrigger to true when capabilities includes triggers', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'trigger-op',
        name: 'trigger',
        type: 'Trigger',
        properties: {
          summary: 'Trigger Operation',
          description: 'A trigger',
          operationType: 'Trigger',
          capabilities: ['triggers'],
          api: {
            id: 'connectionProviders/trigger',
            name: 'trigger',
            displayName: 'Trigger',
            brandColor: '#FF0000',
            iconUri: 'https://example.com/trigger-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.isTrigger).toBe(true);
    });

    test('should set isTrigger to true when trigger property exists', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'trigger-op',
        name: 'trigger',
        type: 'Trigger',
        properties: {
          summary: 'Trigger Operation',
          description: 'A trigger',
          operationType: 'Trigger',
          trigger: 'single',
          api: {
            id: 'connectionProviders/trigger',
            name: 'trigger',
            displayName: 'Trigger',
            brandColor: '#FF0000',
            iconUri: 'https://example.com/trigger-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.isTrigger).toBe(true);
    });

    test('should set isTrigger to false when no trigger property or capabilities', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'action-op',
        name: 'action',
        type: 'Action',
        properties: {
          summary: 'Action Operation',
          description: 'An action',
          operationType: 'Action',
          api: {
            id: 'connectionProviders/action',
            name: 'action',
            displayName: 'Action',
            brandColor: '#00FF00',
            iconUri: 'https://example.com/action-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.isTrigger).toBe(false);
    });

    test('should set isBuiltIn based on connector type', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'builtin-op',
        name: 'builtin',
        type: 'BuiltIn',
        properties: {
          summary: 'Built-in Operation',
          description: 'A built-in operation',
          operationType: 'BuiltIn',
          api: {
            id: 'connectionProviders/builtin',
            name: 'builtin',
            displayName: 'Built-in',
            brandColor: '#0000FF',
            iconUri: 'https://example.com/builtin-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.isBuiltIn).toBe(true);
    });

    test('should set isCustom based on connector type', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'custom-op',
        name: 'custom',
        type: 'Custom',
        properties: {
          summary: 'Custom Operation',
          description: 'A custom operation',
          operationType: 'Custom',
          api: {
            id: 'subscriptions/xxx/custom/myconnector',
            name: 'custom',
            displayName: 'Custom',
            brandColor: '#FF00FF',
            iconUri: 'https://example.com/custom-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.isCustom).toBe(true);
    });

    test('should extract releaseStatus from annotation', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'preview-op',
        name: 'preview',
        type: 'Preview',
        properties: {
          summary: 'Preview Operation',
          description: 'A preview operation',
          operationType: 'Preview',
          annotation: {
            status: 'Preview',
          },
          api: {
            id: 'connectionProviders/preview',
            name: 'preview',
            displayName: 'Preview',
            brandColor: '#FFAA00',
            iconUri: 'https://example.com/preview-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.releaseStatus).toBe('Preview');
    });

    test('should handle operation without annotation', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'no-annotation-op',
        name: 'noannotation',
        type: 'Action',
        properties: {
          summary: 'No Annotation Operation',
          description: 'Operation without annotation',
          operationType: 'Action',
          api: {
            id: 'connectionProviders/action',
            name: 'action',
            displayName: 'Action',
            brandColor: '#00FF00',
            iconUri: 'https://example.com/action-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.releaseStatus).toBeUndefined();
    });

    test('should set category from getConnectorCategoryString', () => {
      const operation: DiscoveryOperation<DiscoveryResultTypes> = {
        id: 'category-op',
        name: 'category',
        type: 'Action',
        properties: {
          summary: 'Category Operation',
          description: 'Operation with category',
          operationType: 'Action',
          api: {
            id: 'connectionProviders/action',
            name: 'action',
            displayName: 'Action',
            brandColor: '#00FF00',
            iconUri: 'https://example.com/action-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation);

      expect(result.category).toBe('Built-in');
    });
  });
});
