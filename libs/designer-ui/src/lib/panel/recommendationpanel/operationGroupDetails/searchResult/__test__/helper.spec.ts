import { describe, test, expect, vi } from 'vitest';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { OperationActionDataFromOperation } from '../helper';

vi.mock('../../../../../connectors', () => ({
  isBuiltInConnector: vi.fn((api) => api.id?.startsWith('connectionProviders/') ?? false),
}));

vi.mock('../../../../../utils', () => ({
  getConnectorCategoryString: vi.fn(() => 'Built-in'),
}));

describe('helper', () => {
  describe('OperationActionDataFromOperation', () => {
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

      const result = OperationActionDataFromOperation(operation);

      expect(result.id).toBe('test-op');
      expect(result.title).toBe('Test Operation');
      expect(result.description).toBe('Test Description');
      expect(result.brandColor).toBe('#0078D4');
      expect(result.iconUri).toBe('https://example.com/http-icon.svg');
      expect(result.connectorName).toBe('HTTP');
      expect(result.apiId).toBe('connectionProviders/http');
    });

    test('should use MCP client icon for McpClientTool operations', () => {
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
            iconUri: 'https://example.com/original-icon.svg',
          },
        },
      };

      const result = OperationActionDataFromOperation(operation);

      // Should use MCP_CLIENT_ICON_URI instead of the api's iconUri
      expect(result.iconUri).toContain('data:image/svg+xml');
      expect(result.iconUri).not.toBe('https://example.com/original-icon.svg');
    });

    test('should use api iconUri for non-MCP operations', () => {
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

      const result = OperationActionDataFromOperation(operation);

      expect(result.iconUri).toBe('https://example.com/http-icon.svg');
    });

    test('should set isTrigger to true when operation has trigger property', () => {
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

      const result = OperationActionDataFromOperation(operation);

      expect(result.isTrigger).toBe(true);
    });

    test('should set isTrigger to false when operation has no trigger property', () => {
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

      const result = OperationActionDataFromOperation(operation);

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

      const result = OperationActionDataFromOperation(operation);

      expect(result.isBuiltIn).toBe(true);
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

      const result = OperationActionDataFromOperation(operation);

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

      const result = OperationActionDataFromOperation(operation);

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

      const result = OperationActionDataFromOperation(operation);

      expect(result.category).toBe('Built-in');
    });
  });
});
