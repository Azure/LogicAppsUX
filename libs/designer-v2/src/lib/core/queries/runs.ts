import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { type ChatHistory, isNullOrUndefined, type LogicAppsV2, type Run, RunService } from '@microsoft/logic-apps-shared';
import { getReactQueryClient } from '../ReactQueryProvider';
import { isRunError } from '@microsoft/designer-ui';
import constants from '../../common/constants';
import { useMemo } from 'react';

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const runsQueriesKeys = {
  runs: 'runs',
  run: 'run',
  allRuns: 'allRuns',
  useNodeRepetition: 'useNodeRepetition',
  useNodeRepetitions: 'useNodeRepetitions',
  useScopeFailedRepetitions: 'useScopeFailedRepetitions',
  useAgentRepetition: 'useAgentRepetition',
  useAgentActionsRepetition: 'useAgentActionsRepetition',
  useActionsChatHistory: 'useActionsChatHistory',
  useRunChatHistory: 'useRunChatHistory',
  useAgentChatInvokeUri: 'useAgentChatInvokeUri',
  useRunInstance: 'useRunInstance',
  useResubmitRun: 'useResubmitRun',
  useCancelRun: 'useCancelRun',
};

export const useRunsInfiniteQuery = (enabled = false) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery(
    [runsQueriesKeys.runs],
    async ({ pageParam }: { pageParam?: string }) => {
      // pageParam is the nextLink when provided
      if (!pageParam) {
        const firstRuns = await RunService().getRuns();
        return { runs: firstRuns.runs ?? [], nextLink: firstRuns?.nextLink };
      }
      const moreRuns = await RunService().getMoreRuns(pageParam);
      return { runs: moreRuns.runs ?? [], nextLink: moreRuns.nextLink };
    },
    {
      enabled,
      ...queryOpts,
      getNextPageParam: (lastPage) => lastPage.nextLink ?? undefined,
      // Seed flattened runs and per-run cache entries so `useRun` can read
      // them without an extra fetch when available.
      onSuccess: (data) => {
        try {
          const allRuns: Run[] = (data?.pages ?? []).flatMap((p: any) => p.runs ?? []);
          const currentRuns = (queryClient.getQueryData([runsQueriesKeys.allRuns]) as Record<string, Run> | undefined) ?? {};
          allRuns.forEach((run) => {
            if (run?.id) {
              queryClient.setQueryData([runsQueriesKeys.run, run.id], run);
              currentRuns[run.id] = run;
            }
          });
          queryClient.setQueryData([runsQueriesKeys.allRuns], currentRuns);
          queryClient.invalidateQueries([runsQueriesKeys.allRuns]);
        } catch {
          // best-effort
        }
      },
    }
  );
};

export const useAllRuns = () => {
  const { data: allRuns = {} } = useQuery<Record<string, Run>>([runsQueriesKeys.allRuns]);

  return useMemo(() => {
    return Object.values(allRuns)
      .filter((run): run is Run => run !== undefined && run !== null)
      .sort((a, b) => {
        const toMillis = (v: any) => (typeof v === 'number' ? v : v ? Date.parse(String(v)) : 0);
        return toMillis(b.properties.startTime) - toMillis(a.properties.startTime);
      });
  }, [allRuns]);
};

export const useRun = (runId: string | undefined) => {
  const queryClient = useQueryClient();
  return useQuery(
    [runsQueriesKeys.run, runId],
    async () => {
      if (!runId) {
        throw new Error('Run ID is required');
      }
      const fetchedRun = await RunService().getRun(runId);
      if (isRunError(fetchedRun)) {
        throw new Error('Run not found');
      }
      // Set in all runs object
      queryClient.setQueryData([runsQueriesKeys.allRuns], (old: Record<string, Run> | undefined) => ({
        ...old,
        [fetchedRun.id]: fetchedRun,
      }));
      return fetchedRun;
    },
    {
      ...queryOpts,
      enabled: !!runId,
      // If the run is running, poll for updates
      refetchInterval: () => {
        const run = queryClient.getQueryData<Run>([runsQueriesKeys.run, runId]);
        if (run && run.properties.status === constants.FLOW_STATUS.RUNNING) {
          return constants.RUN_POLLING_INTERVAL_IN_MS;
        }
        return false;
      },
    }
  );
};

export const getRun = (runId: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(
    [runsQueriesKeys.run, runId],
    async () => {
      const fetchedRun = await RunService().getRun(runId);
      if (isRunError(fetchedRun)) {
        throw new Error('Run not found');
      }
      return fetchedRun;
    },
    {
      ...queryOpts,
      cacheTime: 1000 * 10,
    }
  );
};

export const useNodeRepetition = (
  isEnabled: boolean,
  nodeId: string,
  runId: string | undefined,
  repetitionName: string | undefined,
  parentStatus: string | undefined,
  parentRunIndex: number | undefined,
  isWithinAgenticLoop: boolean
) => {
  return useQuery(
    [runsQueriesKeys.useNodeRepetition, { nodeId, runId, repetitionName, parentStatus, parentRunIndex }],
    async () => {
      if (parentStatus === constants.FLOW_STATUS.SKIPPED) {
        return {
          properties: {
            status: constants.FLOW_STATUS.SKIPPED,
            inputsLink: null,
            outputsLink: null,
            startTime: null,
            endTime: null,
            trackingId: null,
            correlation: null,
          },
        };
      }

      return await RunService().getRepetition({ nodeId, runId }, repetitionName!);
    },
    {
      ...queryOpts,
      retryOnMount: false,
      enabled: repetitionName !== undefined && parentRunIndex !== undefined && isEnabled && !isWithinAgenticLoop,
    }
  );
};

export const getRunRepetition = async (nodeId: string, runId: string, repetitionName: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(
    [runsQueriesKeys.useNodeRepetition, { nodeId, runId, repetitionName }],
    async () => {
      return await RunService().getRepetition({ nodeId, runId }, repetitionName);
    },
    {
      ...queryOpts,
    }
  );
};

export const useNodeRepetitions = (isEnabled: boolean, nodeId: string, runId: string | undefined) => {
  return useQuery(
    [runsQueriesKeys.useNodeRepetitions, { nodeId, runId }],
    async () => {
      return await RunService().getRepetitions({ nodeId, runId });
    },
    {
      ...queryOpts,
      retryOnMount: false,
      enabled: isEnabled,
    }
  );
};

export const getNodeRepetitions = async (nodeId: string, runId: string, noCache = false) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(
    [runsQueriesKeys.useNodeRepetitions, { nodeId, runId }],
    async () => {
      return await RunService().getRepetitions({ nodeId, runId });
    },
    {
      ...queryOpts,
      cacheTime: noCache ? 0 : queryOpts.cacheTime,
    }
  );
};

export const useScopeFailedRepetitions = (normalizedType: string, nodeId: string, runId: string | undefined) => {
  return useQuery(
    [runsQueriesKeys.useScopeFailedRepetitions, { nodeId, runId }],
    async () => {
      let failedRunRepetitions: LogicAppsV2.RunRepetition[] = [];
      try {
        const firstFailedActions = await RunService().getScopeRepetitions({ nodeId, runId }, constants.FLOW_STATUS.FAILED);
        failedRunRepetitions.push(...(firstFailedActions?.value ?? []));
        let nextLink = firstFailedActions?.nextLink;

        while (nextLink) {
          const moreActions = await RunService().getMoreScopeRepetitions(nextLink);
          failedRunRepetitions.push(...(moreActions?.value ?? []));
          nextLink = moreActions?.nextLink;
        }
      } catch {
        failedRunRepetitions = [];
      }

      return parseFailedRepetitions(failedRunRepetitions, nodeId);
    },
    {
      ...queryOpts,
      enabled: normalizedType === constants.NODE.TYPE.FOREACH || normalizedType === constants.NODE.TYPE.UNTIL,
    }
  );
};

export const useAgentRepetition = (
  isEnabled: boolean,
  nodeId: string,
  runId: string | undefined,
  repetitionName: string,
  parentStatus: string | undefined,
  runIndex: number | undefined
) => {
  return useQuery(
    [runsQueriesKeys.useAgentRepetition, { nodeId, runId, repetitionName, parentStatus, runIndex }],
    async () => {
      return RunService().getAgentRepetition({ nodeId, runId }, repetitionName);
    },
    {
      ...queryOpts,
      retryOnMount: false,
      enabled: isEnabled,
    }
  );
};

export const getAgentRepetition = async (nodeId: string, runId: string, repetitionName: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(
    [runsQueriesKeys.useAgentRepetition, { nodeId, runId, repetitionName }],
    async () => {
      return RunService().getAgentRepetition({ nodeId, runId }, repetitionName);
    },
    {
      ...queryOpts,
    }
  );
};

export const useAgentRepetitions = (isEnabled: boolean, nodeId: string, runId: string | undefined) => {
  return useQuery(
    [runsQueriesKeys.useAgentRepetition, { nodeId, runId }],
    async () => {
      return await RunService().getAgentRepetitions({ nodeId, runId });
    },
    {
      ...queryOpts,
      retryOnMount: false,
      enabled: isEnabled,
    }
  );
};

export const getAgentRepetitions = async (nodeId: string, runId: string, noCache = false) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(
    [runsQueriesKeys.useAgentRepetition, { nodeId, runId }],
    async () => {
      return await RunService().getAgentRepetitions({ nodeId, runId });
    },
    {
      ...queryOpts,
      cacheTime: noCache ? 0 : queryOpts.cacheTime,
    }
  );
};

export const useResubmitRun = (runId: string, triggerName: string) => {
  return useMutation([runsQueriesKeys.useResubmitRun, { runId }], async () => {
    return await RunService().resubmitRun?.(runId, triggerName);
  });
};

export const useCancelRun = (runId: string) => {
  return useMutation([runsQueriesKeys.useCancelRun, { runId }], async () => {
    return await RunService().cancelRun(runId);
  });
};

export const useAgentActionsRepetition = (
  isEnabled: boolean,
  nodeId: string,
  runId: string | undefined,
  repetitionName: string,
  runIndex: number | undefined
) => {
  return useQuery(
    [runsQueriesKeys.useAgentActionsRepetition, { nodeId, runId, repetitionName, runIndex }],
    async () => fetchAgentActionsRepetition(nodeId, runId, repetitionName),
    {
      ...queryOpts,
      retryOnMount: false,
      enabled: isEnabled,
    }
  );
};

export const getAgentActionsRepetition = async (
  nodeId: string,
  runId: string | undefined,
  repetitionName: string,
  runIndex: number | undefined,
  noCache = false
) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(
    [runsQueriesKeys.useAgentActionsRepetition, { nodeId, runId, repetitionName, runIndex }],
    async () => fetchAgentActionsRepetition(nodeId, runId, repetitionName),
    {
      ...queryOpts,
      cacheTime: noCache ? 0 : queryOpts.cacheTime,
    }
  );
};

const fetchAgentActionsRepetition = async (nodeId: string, runId: string | undefined, repetitionName: string) => {
  const allActions: LogicAppsV2.RunRepetition[] = [];
  const firstActions = await RunService().getAgentActionsRepetition({ nodeId, runId }, repetitionName);
  allActions.push(...(firstActions?.value ?? []));
  let nextLink = firstActions.nextLink;
  while (nextLink) {
    const moreActions = await RunService().getMoreAgentActionsRepetition(nextLink);
    allActions.push(...(moreActions?.value ?? []));
    nextLink = moreActions?.nextLink;
  }
  return allActions;
};

export const useActionsChatHistory = (nodeIds: string[], runId: string | undefined, isEnabled: boolean) => {
  return useQuery(
    [runsQueriesKeys.useActionsChatHistory, { nodeIds, runId }],
    async () => {
      const allMessages: ChatHistory[] = [];
      for (const nodeId of nodeIds) {
        const messages = await RunService().getActionChatHistory({ nodeId, runId });
        allMessages.push({ nodeId, messages });
      }
      return allMessages;
    },
    {
      ...queryOpts,
      retryOnMount: false,
      enabled: isEnabled && runId !== undefined && nodeIds?.length > 0,
    }
  );
};

export const useRunChatHistory = (runId: string | undefined, isEnabled: boolean) => {
  return useQuery(
    [runsQueriesKeys.useRunChatHistory, { runId }],
    async () => {
      if (isNullOrUndefined(runId)) {
        return null;
      }
      const messages = (await RunService().getRunChatHistory(runId)) ?? [];
      const sortedMessages = messages.sort((a: any, b: any) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
      return [
        {
          nodeId: 'root',
          messages: sortedMessages,
        },
      ];
    },
    {
      ...queryOpts,
      retryOnMount: false,
      enabled: isEnabled && runId !== undefined,
    }
  );
};

export const useChatHistory = (isMonitoringView: boolean, runId: string | undefined, nodeIds: string[] = [], isA2AWorkflow: boolean) => {
  const actionHistoryQuery = useActionsChatHistory(nodeIds, runId, isMonitoringView && !isA2AWorkflow);

  const runHistoryQuery = useRunChatHistory(runId, isMonitoringView && isA2AWorkflow);

  return isA2AWorkflow ? runHistoryQuery : actionHistoryQuery;
};

export const useAgentChatInvokeUri = (isMonitoringView: boolean, isAgenticWorkflow: boolean, id: string | undefined) => {
  return useQuery(
    [runsQueriesKeys.useAgentChatInvokeUri, { id }],
    async () => {
      if (isNullOrUndefined(id)) {
        return null;
      }
      const uri = await RunService().getAgentChatInvokeUri({
        idSuffix: id,
      });
      return uri ?? '';
    },
    {
      ...queryOpts,
      retryOnMount: false,
      enabled: isMonitoringView && isAgenticWorkflow && id !== undefined,
    }
  );
};

export const parseFailedRepetitions = (failedRunRepetitions: LogicAppsV2.RunRepetition[], nodeId: string): number[] => {
  // Early return for empty input
  if (!failedRunRepetitions?.length) {
    return [];
  }

  // Extract and filter valid indices in a single pass
  const failedIndices = failedRunRepetitions
    .map((repetition) => {
      // Use optional chaining for safer property access
      const scopeObject = repetition.properties?.repetitionIndexes?.find((item) => item.scopeName === nodeId);

      // Return the itemIndex if found, otherwise undefined
      return scopeObject?.itemIndex;
    })
    // Filter out undefined values and ensure we have numbers
    .filter((index): index is number => index !== undefined && index !== null && typeof index === 'number');

  // Sort in ascending order
  return failedIndices.sort((a, b) => a - b);
};
