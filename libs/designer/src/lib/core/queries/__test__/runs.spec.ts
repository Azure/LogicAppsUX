import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScopeFailedRepetitions, useAgentActionsRepetition, parseFailedRepetitions } from '../runs';
import { RunService, InitRunService } from '@microsoft/logic-apps-shared';
import constants from '../../../common/constants';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import React from 'react';

// Mock the RunService
vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual('@microsoft/logic-apps-shared');
  return {
    ...actual,
    RunService: vi.fn(),
    InitRunService: vi.fn(),
  };
});

describe('runs queries', () => {
  let queryClient: QueryClient;
  let mockRunService: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockRunService = {
      getScopeRepetitions: vi.fn(),
      getMoreScopeRepetitions: vi.fn(),
      getAgentActionsRepetition: vi.fn(),
      getMoreAgentActionsRepetition: vi.fn(),
    };

    vi.mocked(RunService).mockReturnValue(mockRunService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const createWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('useScopeFailedRepetitions', () => {
    const mockFailedRepetitions: LogicAppsV2.RunRepetition[] = [
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
          repetitionIndexes: [{ scopeName: 'testScope', itemIndex: 2 }],
          status: 'Failed',
          startTime: '2023-01-01T00:02:00Z',
          endTime: '2023-01-01T00:03:00Z',
        },
      },
    ];

    test('should fetch failed repetitions with pagination', async () => {
      const firstPageResponse = {
        value: [mockFailedRepetitions[0]],
        nextLink: 'https://api.example.com/next',
      };

      const secondPageResponse = {
        value: [mockFailedRepetitions[1]],
        nextLink: undefined,
      };

      mockRunService.getScopeRepetitions.mockResolvedValue(firstPageResponse);
      mockRunService.getMoreScopeRepetitions.mockResolvedValue(secondPageResponse);

      const { result } = renderHook(() => useScopeFailedRepetitions(constants.NODE.TYPE.FOREACH, 'testScope', 'runId123'), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRunService.getScopeRepetitions).toHaveBeenCalledWith(
        { nodeId: 'testScope', runId: 'runId123' },
        constants.FLOW_STATUS.FAILED
      );
      expect(mockRunService.getMoreScopeRepetitions).toHaveBeenCalledWith('https://api.example.com/next');
      expect(result.current.data).toEqual([0, 2]);
    });

    test('should handle single page response', async () => {
      const singlePageResponse = {
        value: mockFailedRepetitions,
        nextLink: undefined,
      };

      mockRunService.getScopeRepetitions.mockResolvedValue(singlePageResponse);

      const { result } = renderHook(() => useScopeFailedRepetitions(constants.NODE.TYPE.FOREACH, 'testScope', 'runId123'), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRunService.getScopeRepetitions).toHaveBeenCalledTimes(1);
      expect(mockRunService.getMoreScopeRepetitions).not.toHaveBeenCalled();
      expect(result.current.data).toEqual([0, 2]);
    });

    test('should handle errors and return empty array', async () => {
      mockRunService.getScopeRepetitions.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useScopeFailedRepetitions(constants.NODE.TYPE.FOREACH, 'testScope', 'runId123'), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    test('should be disabled for non-loop node types', () => {
      renderHook(() => useScopeFailedRepetitions('Action', 'testScope', 'runId123'), { wrapper: createWrapper });

      // Query should be disabled and not make service calls
      expect(mockRunService.getScopeRepetitions).not.toHaveBeenCalled();
    });
  });

  describe('useAgentActionsRepetition', () => {
    const mockAgentActions: LogicAppsV2.RunRepetition[] = [
      {
        id: 'action1',
        properties: {
          status: 'Succeeded',
          startTime: '2023-01-01T00:00:00Z',
          endTime: '2023-01-01T00:01:00Z',
        },
      },
      {
        id: 'action2',
        properties: {
          status: 'Failed',
          startTime: '2023-01-01T00:02:00Z',
          endTime: '2023-01-01T00:03:00Z',
        },
      },
    ];

    test('should fetch agent actions with pagination', async () => {
      const firstPageResponse = {
        value: [mockAgentActions[0]],
        nextLink: 'https://api.example.com/agent-next',
      };

      const secondPageResponse = {
        value: [mockAgentActions[1]],
        nextLink: undefined,
      };

      mockRunService.getAgentActionsRepetition.mockResolvedValue(firstPageResponse);
      mockRunService.getMoreAgentActionsRepetition.mockResolvedValue(secondPageResponse);

      const { result } = renderHook(
        () =>
          useAgentActionsRepetition(
            true, // isEnabled
            'agentNode',
            'runId123',
            'rep1',
            'Succeeded',
            0
          ),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRunService.getAgentActionsRepetition).toHaveBeenCalledWith({ nodeId: 'agentNode', runId: 'runId123' }, 'rep1');
      expect(mockRunService.getMoreAgentActionsRepetition).toHaveBeenCalledWith('https://api.example.com/agent-next');
      expect(result.current.data).toEqual(mockAgentActions);
    });

    test('should handle single page response', async () => {
      const singlePageResponse = {
        value: mockAgentActions,
        nextLink: undefined,
      };

      mockRunService.getAgentActionsRepetition.mockResolvedValue(singlePageResponse);

      const { result } = renderHook(
        () =>
          useAgentActionsRepetition(
            true, // isEnabled
            'agentNode',
            'runId123',
            'rep1',
            'Succeeded',
            0
          ),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRunService.getAgentActionsRepetition).toHaveBeenCalledOnce();
      expect(mockRunService.getMoreAgentActionsRepetition).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(mockAgentActions);
    });

    test('should handle empty response', async () => {
      const emptyResponse = {
        value: undefined,
        nextLink: undefined,
      };

      mockRunService.getAgentActionsRepetition.mockResolvedValue(emptyResponse);

      const { result } = renderHook(
        () =>
          useAgentActionsRepetition(
            true, // isEnabled
            'agentNode',
            'runId123',
            'rep1',
            'Succeeded',
            0
          ),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    test('should be disabled when conditions are not met', () => {
      renderHook(
        () =>
          useAgentActionsRepetition(
            false, // isEnabled - disabled
            'agentNode',
            'runId123',
            'rep1',
            'Succeeded',
            0
          ),
        { wrapper: createWrapper }
      );

      // Query should be disabled and not make service calls
      expect(mockRunService.getAgentActionsRepetition).not.toHaveBeenCalled();
    });
  });

  describe('parseFailedRepetitions', () => {
    test('should parse failed repetitions correctly', () => {
      const mockRepetitions: LogicAppsV2.RunRepetition[] = [
        {
          id: 'rep1',
          properties: {
            repetitionIndexes: [{ scopeName: 'testScope', itemIndex: 2 }],
            status: 'Failed',
            startTime: '2023-01-01T00:00:00Z',
            endTime: '2023-01-01T00:01:00Z',
          },
        },
        {
          id: 'rep2',
          properties: {
            repetitionIndexes: [{ scopeName: 'testScope', itemIndex: 0 }],
            status: 'Failed',
            startTime: '2023-01-01T00:02:00Z',
            endTime: '2023-01-01T00:03:00Z',
          },
        },
        {
          id: 'rep3',
          properties: {
            repetitionIndexes: [{ scopeName: 'testScope', itemIndex: 1 }],
            status: 'Failed',
            startTime: '2023-01-01T00:04:00Z',
            endTime: '2023-01-01T00:05:00Z',
          },
        },
      ];

      const result = parseFailedRepetitions(mockRepetitions, 'testScope');
      expect(result).toEqual([0, 1, 2]);
    });

    test('should handle missing repetitionIndexes', () => {
      const mockRepetitions: LogicAppsV2.RunRepetition[] = [
        {
          id: 'rep1',
          properties: {
            status: 'Failed',
            startTime: '2023-01-01T00:00:00Z',
            endTime: '2023-01-01T00:01:00Z',
          },
        },
      ];

      const result = parseFailedRepetitions(mockRepetitions, 'testScope');
      expect(result).toEqual([]);
    });

    test('should handle missing scope object', () => {
      const mockRepetitions: LogicAppsV2.RunRepetition[] = [
        {
          id: 'rep1',
          properties: {
            repetitionIndexes: [{ scopeName: 'otherScope', itemIndex: 0 }],
            status: 'Failed',
            startTime: '2023-01-01T00:00:00Z',
            endTime: '2023-01-01T00:01:00Z',
          },
        },
      ];

      const result = parseFailedRepetitions(mockRepetitions, 'testScope');
      expect(result).toEqual([]);
    });

    test('should handle empty repetitions array', () => {
      const result = parseFailedRepetitions([], 'testScope');
      expect(result).toEqual([]);
    });
  });
});
