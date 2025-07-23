import { useRunInstance, useTimelineRepetitionIndex } from '../../core/state/workflow/workflowSelectors';
import { RunService } from '@microsoft/logic-apps-shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface TimelineRepetition {
  entryReference: string;
  actionResult: {
    name: string;
    code: string;
    status: string;
    startingIterationIndex: number;
    error?: any;
  };
  agentMetadata: {
    taskSequenceId: string;
  };
  type: string;
}

export const useTimelineRepetitions = (): UseQueryResult<TimelineRepetition[]> => {
  const run = useRunInstance();
  return useQuery(
    ['timelineRepetitions', run?.id ?? ''],
    async () => {
      const timelineRepetitions = await RunService().getTimelineRepetitions(run?.id ?? '');
      const parsedData: TimelineRepetition[] = JSON.parse(JSON.stringify(timelineRepetitions))?.value ?? [];
      const sortedData = parsedData.sort((a, b) => a.entryReference.localeCompare(b.entryReference, undefined));

      return sortedData;
    },
    {
      enabled: !!run?.id,
    }
  );
};

export const useTimelineRepetitionOffset = (actionId: string) => {
  const { data: repetitions } = useTimelineRepetitions();
  const timelineIndex = useTimelineRepetitionIndex();
  return useMemo(() => {
    let lastCount = 0;
    for (let i = 0; i < timelineIndex - 1; i++) {
      const action = repetitions?.[i].actionResult;
      if (action?.name === actionId) {
        lastCount = action?.startingIterationIndex ?? 0;
      }
    }
    return lastCount;
  }, [actionId, timelineIndex, repetitions]);
};

export const useTimelineRepetitionCount = (actionId: string) => {
  const { data: repetitions } = useTimelineRepetitions();
  const timelineIndex = useTimelineRepetitionIndex();
  return useMemo(() => {
    const action = repetitions?.[timelineIndex].actionResult;
    if (action?.name === actionId) {
      return action?.startingIterationIndex ?? 0;
    }
    return 0;
  }, [actionId, timelineIndex, repetitions]);
};
