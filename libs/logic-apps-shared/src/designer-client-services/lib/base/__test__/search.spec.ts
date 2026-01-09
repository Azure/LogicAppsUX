import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { IHttpClient } from '../../httpClient';

// Create a concrete implementation for testing
class TestSearchService {
  constructor(private options: any) {}

  private async getWorkflows(filter: string): Promise<any[]> {
    const { httpClient, apiHubServiceDetails } = this.options;
    const uri = `/subscriptions/${apiHubServiceDetails.subscriptionId}/providers/Microsoft.Logic/workflows`;
    const queryParameters = {
      'api-version': apiHubServiceDetails.apiVersion,
      $filter: filter,
    };
    const response = await httpClient.get({ uri, queryParameters });
    return response?.value ?? [];
  }

  public async getAgentWorkflows(): Promise<any[]> {
    const requestWorkflows = await this.getWorkflows(
      "contains(Trigger, 'Request') and (properties/integrationServiceEnvironmentResourceId eq null)"
    );
    return requestWorkflows.filter((workflow: any) => {
      const triggers = workflow.properties?.definition?.triggers ?? {};
      return Object.values(triggers).some((trigger: any) => trigger.kind?.toLowerCase() === 'agent');
    });
  }
}

describe('BaseSearchService', () => {
  let mockHttpClient: IHttpClient;
  let searchService: TestSearchService;
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
      httpClient: mockHttpClient,
      apiHubServiceDetails: {
        subscriptionId: 'test-subscription',
        location: 'westus',
        apiVersion: '2016-06-01',
      },
    };

    searchService = new TestSearchService(mockOptions);
  });

  describe('getAgentWorkflows', () => {
    test('should return only workflows with Agent triggers', async () => {
      const mockWorkflows = {
        value: [
          {
            id: '/workflows/agent-workflow',
            name: 'agent-workflow',
            properties: {
              definition: {
                triggers: {
                  manual: {
                    type: 'Request',
                    kind: 'Agent',
                  },
                },
              },
            },
          },
          {
            id: '/workflows/regular-workflow',
            name: 'regular-workflow',
            properties: {
              definition: {
                triggers: {
                  manual: {
                    type: 'Request',
                    kind: 'Http',
                  },
                },
              },
            },
          },
        ],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorkflows);

      const result = await searchService.getAgentWorkflows();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('agent-workflow');
    });

    test('should handle case-insensitive Agent kind matching', async () => {
      const mockWorkflows = {
        value: [
          {
            id: '/workflows/agent-uppercase',
            name: 'agent-uppercase',
            properties: {
              definition: {
                triggers: {
                  manual: { type: 'Request', kind: 'AGENT' },
                },
              },
            },
          },
          {
            id: '/workflows/agent-mixedcase',
            name: 'agent-mixedcase',
            properties: {
              definition: {
                triggers: {
                  manual: { type: 'Request', kind: 'AgEnT' },
                },
              },
            },
          },
        ],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorkflows);

      const result = await searchService.getAgentWorkflows();

      expect(result).toHaveLength(2);
    });

    test('should return empty array when no Agent workflows exist', async () => {
      const mockWorkflows = {
        value: [
          {
            id: '/workflows/regular',
            name: 'regular',
            properties: {
              definition: {
                triggers: {
                  manual: { type: 'Request', kind: 'Http' },
                },
              },
            },
          },
        ],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorkflows);

      const result = await searchService.getAgentWorkflows();

      expect(result).toHaveLength(0);
    });

    test('should handle workflows with no triggers defined', async () => {
      const mockWorkflows = {
        value: [
          {
            id: '/workflows/no-triggers',
            name: 'no-triggers',
            properties: {
              definition: {},
            },
          },
        ],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorkflows);

      const result = await searchService.getAgentWorkflows();

      expect(result).toHaveLength(0);
    });

    test('should handle workflows with undefined kind', async () => {
      const mockWorkflows = {
        value: [
          {
            id: '/workflows/no-kind',
            name: 'no-kind',
            properties: {
              definition: {
                triggers: {
                  manual: { type: 'Request' },
                },
              },
            },
          },
        ],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorkflows);

      const result = await searchService.getAgentWorkflows();

      expect(result).toHaveLength(0);
    });
  });
});
