import { beforeEach, describe, it, expect, vi } from 'vitest';
import { BaseConnectorService } from '../connector';

import { IHttpClient } from '../../httpClient';
import { ManagedIdentityRequestProperties } from '../../connector';
import { ConnectorServiceException, OperationInfo } from '../../../../utils/src';

// Mock implementation for testing
class TestConnectorService extends BaseConnectorService {
  async getLegacyDynamicContent(): Promise<any> {
    return {};
  }

  async getListDynamicValues(): Promise<any[]> {
    return [];
  }

  async getDynamicSchema(): Promise<any> {
    return {};
  }

  async getTreeDynamicValues(): Promise<any[]> {
    return [];
  }

  // Expose protected methods for testing
  public async testExecuteAzureDynamicApi(
    dynamicInvokeUrl: string,
    apiVersion: string,
    parameters: Record<string, any>,
    properties?: ManagedIdentityRequestProperties | { workflowReference: { id: string } }
  ): Promise<any> {
    return this._executeAzureDynamicApi(dynamicInvokeUrl, apiVersion, parameters, properties);
  }
}

describe('BaseConnectorService', () => {
  let mockHttpClient: IHttpClient;
  let connectorService: TestConnectorService;
  let clientSupportedOperations: OperationInfo[];

  beforeEach(() => {
    mockHttpClient = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      dispose: vi.fn(),
    };

    clientSupportedOperations = [{ connectorId: 'test-connector', operationId: 'test-operation' }];

    connectorService = new TestConnectorService({
      apiVersion: '2023-01-01',
      baseUrl: 'https://test.example.com',
      httpClient: mockHttpClient,
      clientSupportedOperations,
      schemaClient: {},
      valuesClient: {},
    });
  });

  describe('pagination with error handling', () => {
    it('should return original data when pagination fails', async () => {
      // Mock initial response with pagination
      const initialResponse = {
        value: ['item1', 'item2'],
        nextLink: 'https://test.example.com/next',
      };

      // Mock the initial POST request
      (mockHttpClient.post as any).mockResolvedValue({
        response: {
          statusCode: 'OK',
          body: initialResponse,
          headers: {},
        },
      });

      // Mock the pagination GET request to fail
      (mockHttpClient.get as any).mockRejectedValue(new Error('Network error'));

      const parameters = {
        method: 'GET',
        path: '/test',
        body: {},
        queries: {},
        headers: {},
      };

      const result = await connectorService.testExecuteAzureDynamicApi('https://test.example.com', '2023-01-01', parameters);

      expect(result).toEqual({
        value: ['item1', 'item2'], // Original data is preserved
        nextLink: 'https://test.example.com/next',
        __usedNextPage: true,
        __paginationIncomplete: true,
        __paginationError: 'Network error',
      });

      // Verify the calls
      expect(mockHttpClient.post).toHaveBeenCalledOnce();
      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: 'https://test.example.com/next',
        headers: {},
      });
    });

    it('should collect all pages when pagination succeeds', async () => {
      // Mock initial response with pagination
      const initialResponse = {
        value: ['item1', 'item2'],
        nextLink: 'https://test.example.com/page2',
      };

      // Mock second page response
      const secondPageResponse = {
        value: ['item3', 'item4'],
        nextLink: 'https://test.example.com/page3',
      };

      // Mock third page response (last page)
      const thirdPageResponse = {
        value: ['item5', 'item6'],
        // No nextLink - this is the last page
      };

      // Mock the initial POST request
      (mockHttpClient.post as any).mockResolvedValue({
        response: {
          statusCode: 'OK',
          body: initialResponse,
          headers: {},
        },
      });

      // Mock the pagination GET requests
      (mockHttpClient.get as any).mockResolvedValueOnce(secondPageResponse).mockResolvedValueOnce(thirdPageResponse);

      const parameters = {
        method: 'GET',
        path: '/test',
        body: {},
        queries: {},
        headers: {},
      };

      const result = await connectorService.testExecuteAzureDynamicApi('https://test.example.com', '2023-01-01', parameters);

      expect(result).toEqual({
        value: ['item1', 'item2', 'item3', 'item4', 'item5', 'item6'], // All items collected
        nextLink: 'https://test.example.com/page2',
        __usedNextPage: true,
        __paginationIncomplete: false,
        __paginationError: undefined,
      });

      // Verify the calls
      expect(mockHttpClient.post).toHaveBeenCalledOnce();
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should handle pagination failure on second page', async () => {
      // Mock initial response with pagination
      const initialResponse = {
        value: ['item1', 'item2'],
        nextLink: 'https://test.example.com/page2',
      };

      // Mock second page response
      const secondPageResponse = {
        value: ['item3', 'item4'],
        nextLink: 'https://test.example.com/page3',
      };

      // Mock the initial POST request
      (mockHttpClient.post as any).mockResolvedValue({
        response: {
          statusCode: 'OK',
          body: initialResponse,
          headers: {},
        },
      });

      // Mock the pagination GET requests - first succeeds, second fails
      (mockHttpClient.get as any).mockResolvedValueOnce(secondPageResponse).mockRejectedValueOnce(new Error('Timeout error'));

      const parameters = {
        method: 'GET',
        path: '/test',
        body: {},
        queries: {},
        headers: {},
      };

      const result = await connectorService.testExecuteAzureDynamicApi('https://test.example.com', '2023-01-01', parameters);

      expect(result).toEqual({
        value: ['item1', 'item2', 'item3', 'item4'], // Data from successful pages
        nextLink: 'https://test.example.com/page2',
        __usedNextPage: true,
        __paginationIncomplete: true,
        __paginationError: 'Timeout error',
      });

      // Verify the calls
      expect(mockHttpClient.post).toHaveBeenCalledOnce();
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should handle OData nextLink format', async () => {
      // Mock initial response with OData pagination format
      const initialResponse = {
        value: ['item1', 'item2'],
        '@odata.nextLink': 'https://test.example.com/odata-next',
      };

      // Mock the initial POST request
      (mockHttpClient.post as any).mockResolvedValue({
        response: {
          statusCode: 'OK',
          body: initialResponse,
          headers: {},
        },
      });

      // Mock the pagination GET request to fail
      (mockHttpClient.get as any).mockRejectedValue(new Error('OData error'));

      const parameters = {
        method: 'GET',
        path: '/test',
        body: {},
        queries: {},
        headers: {},
      };

      const result = await connectorService.testExecuteAzureDynamicApi('https://test.example.com', '2023-01-01', parameters);

      expect(result).toEqual({
        value: ['item1', 'item2'], // Original data is preserved
        '@odata.nextLink': 'https://test.example.com/odata-next',
        __usedNextPage: true,
        __paginationIncomplete: true,
        __paginationError: 'OData error',
      });

      // Verify the OData nextLink was used
      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: 'https://test.example.com/odata-next',
        headers: {},
      });
    });

    it('should not attempt pagination for non-array responses', async () => {
      // Mock response that's not an array
      const nonArrayResponse = {
        message: 'Success',
        data: { key: 'value' },
        nextLink: 'https://test.example.com/next', // This should be ignored
      };

      // Mock the initial POST request
      (mockHttpClient.post as any).mockResolvedValue({
        response: {
          statusCode: 'OK',
          body: nonArrayResponse,
          headers: {},
        },
      });

      const parameters = {
        method: 'GET',
        path: '/test',
        body: {},
        queries: {},
        headers: {},
      };

      const result = await connectorService.testExecuteAzureDynamicApi('https://test.example.com', '2023-01-01', parameters);

      expect(result).toEqual(nonArrayResponse);

      // Verify no pagination was attempted
      expect(mockHttpClient.post).toHaveBeenCalledOnce();
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should handle invalid pagination response gracefully', async () => {
      // Mock initial response with pagination
      const initialResponse = {
        value: ['item1', 'item2'],
        nextLink: 'https://test.example.com/invalid',
      };

      // Mock invalid pagination response (not an array)
      const invalidPageResponse = {
        message: 'Invalid response',
        // Missing or invalid value array
      };

      // Mock the initial POST request
      (mockHttpClient.post as any).mockResolvedValue({
        response: {
          statusCode: 'OK',
          body: initialResponse,
          headers: {},
        },
      });

      // Mock the pagination GET request to return invalid response
      (mockHttpClient.get as any).mockResolvedValue(invalidPageResponse);

      const parameters = {
        method: 'GET',
        path: '/test',
        body: {},
        queries: {},
        headers: {},
      };

      const result = await connectorService.testExecuteAzureDynamicApi('https://test.example.com', '2023-01-01', parameters);

      expect(result).toEqual({
        value: ['item1', 'item2'], // Original data is preserved
        nextLink: 'https://test.example.com/invalid',
        __usedNextPage: true,
        __paginationIncomplete: true,
        __paginationError: 'Invalid response at nextLink: https://test.example.com/invalid',
      });

      // Verify the calls
      expect(mockHttpClient.post).toHaveBeenCalledOnce();
      expect(mockHttpClient.get).toHaveBeenCalledOnce();
    });
  });

  describe('error handling', () => {
    it('should throw ConnectorServiceException for API failures', async () => {
      (mockHttpClient.post as any).mockRejectedValue(new Error('API Error'));

      const parameters = {
        method: 'GET',
        path: '/test',
        body: {},
        queries: {},
        headers: {},
      };

      await expect(connectorService.testExecuteAzureDynamicApi('https://test.example.com', '2023-01-01', parameters)).rejects.toThrow(
        ConnectorServiceException
      );
    });

    it('should handle non-OK status codes', async () => {
      (mockHttpClient.post as any).mockResolvedValue({
        response: {
          statusCode: 'BadRequest',
          body: { error: { message: 'Invalid request' } },
          headers: {},
        },
      });

      const parameters = {
        method: 'GET',
        path: '/test',
        body: {},
        queries: {},
        headers: {},
      };

      await expect(connectorService.testExecuteAzureDynamicApi('https://test.example.com', '2023-01-01', parameters)).rejects.toThrow(
        ConnectorServiceException
      );
    });
  });
});
