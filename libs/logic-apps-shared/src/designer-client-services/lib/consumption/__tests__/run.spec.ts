import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ConsumptionRunService } from '../run';
import type { IHttpClient } from '../../httpClient';

describe('ConsumptionRunService', () => {
  let runService: ConsumptionRunService;
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
      baseUrl: 'https://api.example.com',
      apiVersion: '2016-06-01',
      accessToken: 'Bearer test-token',
      httpClient: mockHttpClient,
      workflowId: 'test-workflow',
    };

    runService = new ConsumptionRunService(mockOptions);
  });

  describe('getMoreScopeRepetitions', () => {
    test('should fetch more scope repetitions using continuation token', async () => {
      const mockResponse = {
        value: [
          {
            id: 'rep1',
            properties: {
              repetitionIndexes: [{ scopeName: 'testScope', itemIndex: 0 }],
              status: 'Failed',
              startTime: '2023-01-01T00:00:00Z',
              endTime: '2023-01-01T00:01:00Z',
            },
          },
          {
            id: 'rep2',
            properties: {
              repetitionIndexes: [{ scopeName: 'testScope', itemIndex: 1 }],
              status: 'Failed',
              startTime: '2023-01-01T00:02:00Z',
              endTime: '2023-01-01T00:03:00Z',
            },
          },
        ],
        nextLink: 'https://api.example.com/next',
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

      const continuationToken = 'https://api.example.com/scope-repetitions?continuationToken=abc123';
      const result = await runService.getMoreScopeRepetitions(continuationToken);

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: continuationToken,
        headers: expect.any(Object),
      });

      expect(result).toEqual(mockResponse);
    });

    test('should handle empty response', async () => {
      const mockResponse = {
        value: [],
        nextLink: undefined,
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

      const continuationToken = 'https://api.example.com/scope-repetitions?continuationToken=empty';
      const result = await runService.getMoreScopeRepetitions(continuationToken);

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: continuationToken,
        headers: expect.any(Object),
      });

      expect(result).toEqual(mockResponse);
    });

    test('should throw error when HTTP request fails', async () => {
      const errorMessage = 'Network error';
      vi.mocked(mockHttpClient.get).mockRejectedValue(new Error(errorMessage));

      const continuationToken = 'https://api.example.com/scope-repetitions?continuationToken=error';

      await expect(runService.getMoreScopeRepetitions(continuationToken)).rejects.toThrow(errorMessage);

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: continuationToken,
        headers: expect.any(Object),
      });
    });

    test('should handle invalid continuation token', async () => {
      const errorMessage = 'Invalid continuation token';
      vi.mocked(mockHttpClient.get).mockRejectedValue(new Error(errorMessage));

      const continuationToken = 'invalid-token';

      await expect(runService.getMoreScopeRepetitions(continuationToken)).rejects.toThrow(errorMessage);

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: continuationToken,
        headers: expect.any(Object),
      });
    });

    test('should include correct authorization headers', async () => {
      const mockResponse = { value: [], nextLink: undefined };
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

      const continuationToken = 'https://api.example.com/scope-repetitions?continuationToken=auth-test';
      await runService.getMoreScopeRepetitions(continuationToken);

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: continuationToken,
        headers: expect.any(Object),
      });

      // Verify the headers contain the correct authorization
      const call = vi.mocked(mockHttpClient.get).mock.calls[0][0];
      expect(call.headers).toBeInstanceOf(Headers);
      expect(call.headers.get('Authorization')).toBe(mockOptions.accessToken);
    });
  });

  describe('integration with getScopeRepetitions', () => {
    test('should work with getScopeRepetitions pagination flow', async () => {
      // Mock the first page response
      const firstPageResponse = {
        value: [
          {
            id: 'rep1',
            properties: {
              repetitionIndexes: [{ scopeName: 'testScope', itemIndex: 0 }],
              status: 'Failed',
              startTime: '2023-01-01T00:00:00Z',
              endTime: '2023-01-01T00:01:00Z',
            },
          },
        ],
        nextLink: 'https://api.example.com/next-page',
      };

      // Mock the second page response
      const secondPageResponse = {
        value: [
          {
            id: 'rep2',
            properties: {
              repetitionIndexes: [{ scopeName: 'testScope', itemIndex: 1 }],
              status: 'Failed',
              startTime: '2023-01-01T00:02:00Z',
              endTime: '2023-01-01T00:03:00Z',
            },
          },
        ],
        nextLink: undefined,
      };

      // First call should return first page
      vi.mocked(mockHttpClient.get).mockResolvedValueOnce(firstPageResponse).mockResolvedValueOnce(secondPageResponse);

      // Test first page
      const action = { nodeId: 'testScope', runId: 'run123' };
      const firstResult = await runService.getScopeRepetitions(action, 'Failed');
      expect(firstResult).toEqual(firstPageResponse);

      // Test second page using continuation token
      const secondResult = await runService.getMoreScopeRepetitions(firstPageResponse.nextLink);
      expect(secondResult).toEqual(secondPageResponse);

      // Verify HTTP calls
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          uri: expect.stringContaining('testScope/scopeRepetitions'),
        })
      );
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          uri: 'https://api.example.com/next-page',
        })
      );
    });
  });
});
