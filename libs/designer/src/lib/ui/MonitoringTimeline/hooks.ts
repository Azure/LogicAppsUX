import { useRunInstance, useTimelineRepetitionIndex } from '../../core/state/workflow/workflowSelectors';
import { RunService } from '@microsoft/logic-apps-shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface TimelineRepetition {
  properties: {
    agentMetadata: {
      taskSequenceId: string;
      agentName: string;
    };
    canResubmit: boolean;
    startTime: string;
    correlation: {
      actionTrackingId: string;
      clientTrackingId: string;
    };
    status: string;
    code: string;
    error?: any;
  };
  id: string;
  name: string;
  type: string;
}

export const useTimelineRepetitions = (): UseQueryResult<TimelineRepetition[]> => {
  const run = useRunInstance();
  return useQuery(
    ['timelineRepetitions', run?.id ?? ''],
    async () => {
      const timelineRepetitions = await RunService().getTimelineRepetitions(run?.id ?? '');
      const parsedData: TimelineRepetition[] = JSON.parse(JSON.stringify(timelineRepetitions))?.value ?? [];
      const sortedData = parsedData.sort((a, b) => a.name.localeCompare(b.name));

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
      const repetition = repetitions?.[i];
      if (repetition?.name === actionId) {
        lastCount = Number.parseInt(repetition.name) || 0;
      }
    }
    return lastCount;
  }, [actionId, timelineIndex, repetitions]);
};

export const useTimelineRepetitionCount = (actionId: string) => {
  const { data: repetitions } = useTimelineRepetitions();
  const timelineIndex = useTimelineRepetitionIndex();
  return useMemo(() => {
    const repetition = repetitions?.[timelineIndex];
    if (repetition?.name === actionId) {
      return Number.parseInt(repetition.name) || 0;
    }
    return 0;
  }, [actionId, timelineIndex, repetitions]);
};
