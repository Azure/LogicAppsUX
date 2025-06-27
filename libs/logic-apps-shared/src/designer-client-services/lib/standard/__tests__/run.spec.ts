import { StandardRunService } from '../run';
import type { IHttpClient } from '../../httpClient';
import type { LogicAppsV2 } from '../../../../utils/src';
import { describe, vi, beforeEach, it, expect } from 'vitest';

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

    it('should handle different valid status values with proper quoting', async () => {
      const validStatuses = [
        'Succeeded',
        'Failed',
        'Running',
        'Cancelled',
        'Aborted',
        'Faulted',
        'Ignored',
        'Paused',
        'Skipped',
        'Suspended',
        'TimedOut',
        'Waiting',
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRepetitionsResponse);

      for (const status of validStatuses) {
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

  describe('status validation', () => {
    const mockAction = {
      nodeId: 'testNode',
      runId: '/workflows/testWorkflow/runs/testRun',
    };

    it('should reject invalid status values with descriptive error message', async () => {
      const invalidStatuses = [
        'InvalidStatus',
        'SUCCEEDED', // Wrong case
        'failed', // Wrong case
        'Custom_Status',
        "'; DROP TABLE users; --", // SQL injection attempt
        'null',
        'undefined',
        'random-status',
      ];

      for (const invalidStatus of invalidStatuses) {
        await expect(runService.getScopeRepetitions(mockAction, invalidStatus)).rejects.toThrow(
          `Invalid status value: '${invalidStatus}'. Allowed values are: Aborted, Cancelled, Failed, Faulted, Ignored, Paused, Running, Skipped, Succeeded, Suspended, TimedOut, Waiting`
        );
      }

      // Ensure no HTTP requests were made for invalid statuses
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should accept all valid FLOW_STATUS values', async () => {
      const validStatuses = [
        'Aborted',
        'Cancelled',
        'Failed',
        'Faulted',
        'Ignored',
        'Paused',
        'Running',
        'Skipped',
        'Succeeded',
        'Suspended',
        'TimedOut',
        'Waiting',
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue({ value: [] });

      for (const validStatus of validStatuses) {
        await expect(runService.getScopeRepetitions(mockAction, validStatus)).resolves.not.toThrow();

        const callArgs = vi.mocked(mockHttpClient.get).mock.calls.pop()?.[0];
        const filterValue = callArgs?.queryParameters?.['$filter'];
        expect(filterValue).toBe(`status eq '${validStatus}'`);
      }
    });

    it('should handle empty string by not creating filter (no validation needed)', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue({ value: [] });

      await runService.getScopeRepetitions(mockAction, '');

      const callArgs = vi.mocked(mockHttpClient.get).mock.calls[0][0];
      expect(callArgs?.queryParameters?.['$filter']).toBeUndefined();
    });

    it('should prevent injection attacks by validating status values', async () => {
      const maliciousInputs = [
        "Succeeded'; DROP TABLE users; --",
        "Failed' OR 1=1 --",
        'Running"; DELETE FROM logs; --',
        "Succeeded' UNION SELECT * FROM sensitive_data --",
      ];

      for (const maliciousInput of maliciousInputs) {
        await expect(runService.getScopeRepetitions(mockAction, maliciousInput)).rejects.toThrow(
          `Invalid status value: '${maliciousInput}'`
        );
      }

      // Ensure no HTTP requests were made for malicious inputs
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });
  });
});
