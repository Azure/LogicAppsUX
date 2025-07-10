import type { WorkflowRunAction } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';
import { useRunInstance, useTimelineRepetitionIndex } from '../../core/state/workflow/workflowSelectors';
import { RunService } from '@microsoft/logic-apps-shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface TimelineRepetition {
  id: string;
  name: string;
  properties: {
    actions: Record<string, WorkflowRunAction>;
    canResubmit: boolean;
    correlation: any;
    startTime: string;
    status: string;
  };
  type: string;
}

export const useTimelineRepetitions = (): UseQueryResult<TimelineRepetition[]> => {
  const run = useRunInstance();
  return useQuery(
    ['timelineRepetitions', run?.id ?? ''],
    async () => {
      const timelineRepetitions = await RunService().getTimelineRepetitions(run!.id);
      const parsedData: TimelineRepetition[] = JSON.parse(JSON.stringify(timelineRepetitions))?.value ?? [];
      const sortedData = parsedData.sort((a, b) => new Date(a.properties.startTime).getTime() - new Date(b.properties.startTime).getTime());
      console.log('Timeline Repetitions:', sortedData);
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
      const actions = repetitions?.[i]?.properties?.actions ?? {};
      for (const entry of Object.entries(actions)) {
        const [_actionId, action] = entry;
        if (_actionId === actionId) {
          lastCount = action?.repetitionCount ?? 0;
        }
      }
    }
    return lastCount;
  }, [actionId, timelineIndex, repetitions]);
};

export const useTimelineRepetitionCount = (actionId: string) => {
  const { data: repetitions } = useTimelineRepetitions();
  const timelineIndex = useTimelineRepetitionIndex();
  return useMemo(() => {
    const actions = repetitions?.[timelineIndex]?.properties?.actions ?? {};
    for (const entry of Object.entries(actions)) {
      const [_actionId, action] = entry;
      if (_actionId === actionId) {
        return action?.repetitionCount ?? 0;
      }
    }
    return 0;
  }, [actionId, timelineIndex, repetitions]);
};
