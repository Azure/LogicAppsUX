import { StandardRunService } from '../run';
import type { IHttpClient } from '../../httpClient';
import type { LogicAppsV2 } from '../../../../utils/src';
import { describe, vi, beforeEach, it, test, expect } from 'vitest';

describe('StandardRunService', () => {
  let mockHttpClient: IHttpClient;
  let runService: StandardRunService;
  const mockOptions = {
    apiVersion: '2022-05-01',
    baseUrl: 'https://management.azure.com/subscriptions/test/resourceGroups/test/providers/Microsoft.Logic/workflows/test',
    httpClient: {} as IHttpClient,
    workflowName: 'testWorkflow',
    isDev: false,
  };

  beforeEach(() => {
    mockHttpClient = {
      dispose: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };
    mockOptions.httpClient = mockHttpClient;
    runService = new StandardRunService(mockOptions);
  });

  describe('getScopeRepetitions', () => {
    const mockAction = {
      nodeId: 'testNode',
      runId: '/workflows/testWorkflow/runs/testRun',
    };

    const mockRepetitionsResponse = {
      value: [
        { id: 'rep1', properties: { status: 'Succeeded' } },
        { id: 'rep2', properties: { status: 'Failed' } },
      ] as LogicAppsV2.RunRepetition[],
    };

    it('should construct correct filter query parameter when status is provided', async () => {
      const status = 'Succeeded';
      const expectedUri = `${mockOptions.baseUrl}${mockAction.runId}/actions/${mockAction.nodeId}/scopeRepetitions`;

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRepetitionsResponse);

      await runService.getScopeRepetitions(mockAction, status);

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: expectedUri,
        queryParameters: {
          $filter: `status eq '${status}'`,
          'api-version': mockOptions.apiVersion,
        },
      });
    });

    it('should properly quote status value in filter to prevent malformed queries', async () => {
      const status = 'Succeeded';

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRepetitionsResponse);

      await runService.getScopeRepetitions(mockAction, status);

      const callArgs = vi.mocked(mockHttpClient.get).mock.calls[0][0];
      const filterValue = callArgs.queryParameters?.['$filter'];

      // Ensure the filter has proper single quotes around the status value
      expect(filterValue).toBe(`status eq '${status}'`);
      expect(filterValue).toMatch(/status eq '[^']*'/); // Regex to ensure proper quoting
      expect(filterValue).not.toMatch(/status eq '[^']*$/); // Ensure closing quote exists
    });

    it('should handle different status values with proper quoting', async () => {
      const testStatuses = ['Succeeded', 'Failed', 'Running', 'Cancelled', 'Skipped'];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRepetitionsResponse);

      for (const status of testStatuses) {
        await runService.getScopeRepetitions(mockAction, status);

        const callArgs = vi.mocked(mockHttpClient.get).mock.calls.pop()?.[0];
        const filterValue = callArgs?.queryParameters?.['$filter'];

        expect(filterValue).toBe(`status eq '${status}'`);
        expect(filterValue).toMatch(/^status eq '[^']*'$/);
      }
    });

    it('should not include filter parameter when status is not provided', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRepetitionsResponse);

      await runService.getScopeRepetitions(mockAction);

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: expect.any(String),
        queryParameters: {
          'api-version': mockOptions.apiVersion,
        },
      });
    });

    it('should not include filter parameter when status is undefined', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRepetitionsResponse);

      await runService.getScopeRepetitions(mockAction, undefined);

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: expect.any(String),
        queryParameters: {
          'api-version': mockOptions.apiVersion,
        },
      });
    });

    it('should not include filter parameter when status is empty string', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRepetitionsResponse);

      await runService.getScopeRepetitions(mockAction, '');

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: expect.any(String),
        queryParameters: {
          'api-version': mockOptions.apiVersion,
        },
      });
    });

    it('should handle status values with special characters properly', async () => {
      const specialStatuses = ['Status-With-Dashes', 'Status With Spaces', "Status'With'Quotes"];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRepetitionsResponse);

      for (const status of specialStatuses) {
        await runService.getScopeRepetitions(mockAction, status);

        const callArgs = vi.mocked(mockHttpClient.get).mock.calls.pop()?.[0];
        const filterValue = callArgs?.queryParameters?.['$filter'];

        expect(filterValue).toBe(`status eq '${status}'`);
        // Ensure the filter is properly formatted regardless of special characters
        expect(filterValue).toMatch(/^status eq '.+'$/);
      }
    });

    it('should return empty array in dev mode regardless of status', async () => {
      const devRunService = new StandardRunService({ ...mockOptions, isDev: true });

      const result = await devRunService.getScopeRepetitions(mockAction, 'Succeeded');

      expect(result).toEqual({ value: [] });
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should pass query parameters to hybrid logic app method when applicable', async () => {
      const hybridUri = 'https://test.com/providers/Microsoft.App/logicApps/testApp/runtime/hostruntime/workflows/test';
      const hybridAction = {
        nodeId: 'testNode',
        runId: hybridUri,
      };
      const status = 'Succeeded';

      const hybridRunService = new StandardRunService({
        ...mockOptions,
        baseUrl: hybridUri,
      });

      // Mock the private method by creating a spy
      const fetchHybridSpy = vi.spyOn(hybridRunService as any, 'fetchHybridLogicAppRunRepetitions');
      fetchHybridSpy.mockResolvedValue(mockRepetitionsResponse);

      await hybridRunService.getScopeRepetitions(hybridAction, status);

      expect(fetchHybridSpy).toHaveBeenCalledWith(expect.stringContaining(hybridUri), 'GET', mockHttpClient, {
        $filter: `status eq '${status}'`,
      });
    });

    it('should throw error when http client fails', async () => {
      const errorMessage = 'Network error';
      vi.mocked(mockHttpClient.get).mockRejectedValue(new Error(errorMessage));

      await expect(runService.getScopeRepetitions(mockAction, 'Succeeded')).rejects.toThrow(errorMessage);
    });

    it('should return response value on successful call', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRepetitionsResponse);

      const result = await runService.getScopeRepetitions(mockAction, 'Succeeded');

      expect(result).toEqual(mockRepetitionsResponse);
    });
  });

  describe('constructor validation', () => {
    it('should validate required arguments on construction', () => {
      expect(
        () =>
          new StandardRunService({
            apiVersion: null as any,
            baseUrl: undefined as any,
            httpClient: mockHttpClient,
            workflowName: 'test',
          })
      ).toThrow('apiVersion is required');
    });

    it('should set isDev flag correctly', () => {
      const devService = new StandardRunService({ ...mockOptions, isDev: true });
      expect((devService as any)._isDev).toBe(true);

      const prodService = new StandardRunService({ ...mockOptions, isDev: false });
      expect((prodService as any)._isDev).toBe(false);
    });
  });

  describe('filter query construction edge cases', () => {
    const mockAction = {
      nodeId: 'testNode',
      runId: '/workflows/testWorkflow/runs/testRun',
    };

    it('should prevent SQL injection-like attempts in status parameter', async () => {
      const maliciousStatus = "'; DROP TABLE users; --";

      vi.mocked(mockHttpClient.get).mockResolvedValue({ value: [] });

      await runService.getScopeRepetitions(mockAction, maliciousStatus);

      const callArgs = vi.mocked(mockHttpClient.get).mock.calls[0][0];
      const filterValue = callArgs.queryParameters?.['$filter'];

      // The malicious input should be treated as a literal string value
      expect(filterValue).toBe(`status eq '${maliciousStatus}'`);
      expect(filterValue).toMatch(/^status eq '.+'$/);
    });

    it('should handle null-like string values correctly', async () => {
      const nullLikeStatuses = ['null', 'undefined', 'NaN', ''];

      vi.mocked(mockHttpClient.get).mockResolvedValue({ value: [] });

      for (const status of nullLikeStatuses) {
        if (status === '') {
          // Empty string should not create a filter
          await runService.getScopeRepetitions(mockAction, status);
          const callArgs = vi.mocked(mockHttpClient.get).mock.calls.pop()?.[0];
          expect(callArgs?.queryParameters?.['$filter']).toBeUndefined();
        } else {
          await runService.getScopeRepetitions(mockAction, status);
          const callArgs = vi.mocked(mockHttpClient.get).mock.calls.pop()?.[0];
          const filterValue = callArgs?.queryParameters?.['$filter'];
          expect(filterValue).toBe(`status eq '${status}'`);
        }
      }
    });
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
      });
    });

    test('should handle invalid continuation token', async () => {
      const errorMessage = 'Invalid continuation token';
      vi.mocked(mockHttpClient.get).mockRejectedValue(new Error(errorMessage));

      const continuationToken = 'invalid-token';

      await expect(runService.getMoreScopeRepetitions(continuationToken)).rejects.toThrow(errorMessage);

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: continuationToken,
      });
    });

    test('should not include authorization headers (handled by Azure)', async () => {
      const mockResponse = { value: [], nextLink: undefined };
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

      const continuationToken = 'https://api.example.com/scope-repetitions?continuationToken=auth-test';
      await runService.getMoreScopeRepetitions(continuationToken);

      expect(mockHttpClient.get).toHaveBeenCalledWith({
        uri: continuationToken,
        // Note: Standard service doesn't include explicit headers like consumption service
      });
    });
  });

  describe('integration with getScopeRepetitions', () => {
    test('should work with getScopeRepetitions pagination flow', async () => {
      const mockAction = {
        nodeId: 'testScope',
        runId: 'run123',
      };

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
      const firstResult = await runService.getScopeRepetitions(mockAction, 'Failed');
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
