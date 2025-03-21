import { useQuery } from '@tanstack/react-query';
import { isNullOrUndefined, type LogicAppsV2, type Run, RunService } from '@microsoft/logic-apps-shared';
import { getReactQueryClient } from '../ReactQueryProvider';
import { isRunError } from '@microsoft/designer-ui';
import constants from '../../common/constants';

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const useRuns = (enabled = false) => {
  return useQuery(
    ['runs'],
    async () => {
      const allRuns: Run[] = [];
      const firstRuns = await RunService().getRuns();
      allRuns.push(...firstRuns.runs);
      let nextLink = firstRuns.nextLink;
      while (nextLink) {
        const moreRuns = await RunService().getMoreRuns(nextLink);
        allRuns.push(...moreRuns.runs);
        nextLink = moreRuns.nextLink;
      }
      return allRuns;
    },
    {
      enabled,
      ...queryOpts,
    }
  );
};

export const getRun = (runId: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(
    ['run', runId],
    async () => {
      const fetchedRun = await RunService().getRun(runId);
      if (isRunError(fetchedRun)) {
        throw new Error('Run not found');
      }

      await queryClient.cancelQueries({ queryKey: ['runs'] });
      queryClient.setQueryData<Run[]>(['runs'], (oldRuns) => {
        let updatedExisting = false;
        const newRuns = (oldRuns ?? []).map((run) => {
          if (run.id === fetchedRun.id) {
            updatedExisting = true;
            return fetchedRun;
          }
          return run;
        });
        if (!updatedExisting) {
          newRuns.unshift(fetchedRun);
        }
        return newRuns;
      });
      return fetchedRun;
    },
    {
      ...queryOpts,
      cacheTime: 1000 * 10,
    }
  );
};

export const useNodeRepetition = (
  isMonitoringView: boolean,
  isParentAgent: boolean,
  nodeId: string,
  runId: string | undefined,
  repetitionName: string,
  parentStatus: string | undefined,
  parentRunIndex: number | undefined,
  referenceUri?: string | undefined
) => {
  return useQuery(
    ['useNodeRepetition', { nodeId, runId, repetitionName, parentStatus, referenceUri }],
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

      if (isParentAgent && referenceUri) {
        return await RunService().getAgentRepetition(referenceUri);
      }

      return await RunService().getRepetition({ nodeId, runId }, repetitionName);
    },
    {
      ...queryOpts,
      retryOnMount: false,
      enabled: parentRunIndex !== undefined && isMonitoringView,
    }
  );
};

export const useScopeFailedRepetitions = (normalizedType: string, nodeId: string, runId: string | undefined) => {
  return useQuery(
    ['runRepetitions', { nodeId, runId }],
    async () => {
      let failedRunRepetitions: LogicAppsV2.RunRepetition[] = [];
      try {
        const { value } = await RunService().getScopeRepetitions({ nodeId, runId }, constants.FLOW_STATUS.FAILED);
        failedRunRepetitions = value;
      } catch {
        failedRunRepetitions = [];
      }
      const _failedRepetitions: number[] = failedRunRepetitions.reduce((acc: number[], current: LogicAppsV2.RunRepetition) => {
        const scopeObject = current.properties?.repetitionIndexes?.find((item) => item.scopeName === nodeId);
        const indexOfFail = isNullOrUndefined(scopeObject) ? undefined : scopeObject.itemIndex;
        acc.push(indexOfFail ?? []);
        return acc;
      }, []);
      return _failedRepetitions.sort((a, b) => a - b);
    },
    {
      ...queryOpts,
      enabled: normalizedType === constants.NODE.TYPE.FOREACH || normalizedType === constants.NODE.TYPE.UNTIL,
    }
  );
};

export const useScopeRepetition = (
  isMonitoringView: boolean,
  isAgent: boolean,
  nodeId: string,
  runId: string | undefined,
  repetitionName: string,
  parentStatus: string | undefined,
  runIndex: number | undefined
) => {
  return useQuery(
    ['runScopeRepetition', { nodeId, runId, repetitionName, parentStatus, runIndex }],
    async () => {
      return RunService().getScopeRepetition({ nodeId, runId }, repetitionName);
    },
    {
      ...queryOpts,
      retryOnMount: false,
      enabled: isMonitoringView && runIndex !== undefined && isAgent,
    }
  );
};
