import type { WorkflowRunAction } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';
import { useRunInstance, useTransitionRepetitionIndex } from '../../core/state/workflow/workflowSelectors';
import { RunService } from '@microsoft/logic-apps-shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface TransitionRepetition {
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

export const useTransitionRepetitions = (): UseQueryResult<TransitionRepetition[]> => {
  const run = useRunInstance();
  return useQuery(
    ['stateTransitions', run?.id ?? ''],
    async () => {
      const stateTransitions = await RunService().getStateTransitions(run!.id);
      const parsedData: TransitionRepetition[] = JSON.parse(JSON.stringify(stateTransitions))?.value ?? [];
      return parsedData.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    },
    {
      enabled: !!run?.id,
    }
  );
};

export const useActionTransitionRepetitionOffset = (actionId: string) => {
  const { data: repetitions } = useTransitionRepetitions();
  const transitionIndex = useTransitionRepetitionIndex();
  return useMemo(() => {
    let count = 0;
    for (let i = 0; i < transitionIndex - 1; i++) {
      const actions = repetitions?.[i]?.properties?.actions ?? {};
      for (const entry of Object.entries(actions)) {
        const [_actionId, action] = entry;
        if (_actionId === actionId) {
          count += action?.iterationCount ?? 0;
        }
      }
    }
    return count;
  }, [actionId, transitionIndex, repetitions]);
};
