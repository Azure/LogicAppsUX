import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ConsumptionOperationManifestService } from '../operationmanifest';
import type { IHttpClient } from '../../httpClient';

describe('ConsumptionOperationManifestService', () => {
  let operationManifestService: ConsumptionOperationManifestService;
  let mockHttpClient: IHttpClient;
  let mockOptions: any;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      dispose: vi.fn(),
    };

    mockOptions = {
      apiVersion: '2016-06-01',
      baseUrl: 'https://api.example.com',
      httpClient: mockHttpClient,
      subscriptionId: 'test-subscription',
      location: 'westus',
    };

    operationManifestService = new ConsumptionOperationManifestService(mockOptions);
  });

  describe('getOperationInfo', () => {
    test('should return correct operation info for workflow type', async () => {
      const definition = {
        type: 'workflow',
        inputs: {},
      };

      const result = await operationManifestService.getOperationInfo(definition, false);

      expect(result.connectorId).toBe('/connectionProviders/workflow');
      expect(result.operationId).toBe('invokeworkflow');
    });

    test('should return correct operation info for nestedagent type', async () => {
      const definition = {
        type: 'nestedagent',
        inputs: {},
      };

      const result = await operationManifestService.getOperationInfo(definition, false);

      expect(result.connectorId).toBe('/connectionProviders/workflow');
      expect(result.operationId).toBe('invokenestedagent');
    });

    test('should handle case-insensitive nestedagent type', async () => {
      const definition = {
        type: 'NestedAgent',
        inputs: {},
      };

      const result = await operationManifestService.getOperationInfo(definition, false);

      expect(result.connectorId).toBe('/connectionProviders/workflow');
      expect(result.operationId).toBe('invokenestedagent');
    });

    test('should return correct operation info for function type without uri', async () => {
      const definition = {
        type: 'function',
        inputs: {},
      };

      const result = await operationManifestService.getOperationInfo(definition, false);

      expect(result.connectorId).toBe('/connectionProviders/azureFunctionOperation');
      expect(result.operationId).toBe('azureFunction');
    });

    test('should return correct operation info for function type with uri', async () => {
      const definition = {
        type: 'function',
        inputs: { uri: 'https://example.com/api' },
      };

      const result = await operationManifestService.getOperationInfo(definition, false);

      expect(result.connectorId).toBe('/connectionProviders/azureFunctionOperation');
      expect(result.operationId).toBe('azureSwaggerFunction');
    });
  });

  describe('isSupported', () => {
    test('should return true for nestedagent operation type', () => {
      const result = operationManifestService.isSupported('nestedagent');
      expect(result).toBe(true);
    });

    test('should return true for workflow operation type', () => {
      const result = operationManifestService.isSupported('workflow');
      expect(result).toBe(true);
    });

    test('should handle case-insensitive operation types', () => {
      const result = operationManifestService.isSupported('NestedAgent');
      expect(result).toBe(true);
    });
  });

  describe('getOperationManifest', () => {
    test('should return manifest for invokenestedagent operation', async () => {
      const result = await operationManifestService.getOperationManifest('/connectionProviders/workflow', 'invokenestedagent');

      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
    });

    test('should return manifest for invokeWorkflow operation', async () => {
      const result = await operationManifestService.getOperationManifest('/connectionProviders/workflow', 'invokeWorkflow');

      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
    });
  });
});
