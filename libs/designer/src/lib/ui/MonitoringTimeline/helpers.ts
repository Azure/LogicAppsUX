import type { TimelineRepetition } from './hooks';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

export interface TimelineRepetitionWithActions {
  actionIds: string[] | undefined;
  repetitionIndex: number;
  data?: TimelineRepetition;
}

export const parseRepetitions = (
  repetitionData: TimelineRepetition[] | undefined,
  runInstance: LogicAppsV2.RunInstanceDefinition | null
): Map<number, TimelineRepetitionWithActions[]> => {
  if ((repetitionData ?? []).length === 0) {
    return new Map();
  }

  // Add trigger (not a repetition)
  const triggerId = runInstance?.properties?.trigger?.name ?? '';
  const trigger = runInstance?.properties?.trigger as LogicAppsV2.WorkflowRunTrigger;
  const repetitions = [
    {
      actionIds: [triggerId],
      repetitionIndex: -1,
      data: {
        id: triggerId,
        name: triggerId,
        properties: {
          actions: {
            [triggerId]: trigger,
          },
          canResubmit: trigger?.canResubmit ?? false,
          correlation: trigger?.correlation ?? '',
          startTime: trigger?.startTime ?? '',
          status: trigger?.status ?? 'Unknown',
          a2ametadata: {
            taskId: 0,
          },
        },
        type: 'trigger',
      },
    },
  ];

  // Add all repetitions
  repetitions.push(
    ...(repetitionData ?? [])
      .map((repetition: any) => ({
        actionIds: Object.keys(repetition.properties.actions ?? {}),
        repetitionIndex: Number(repetition.name),
        data: repetition,
      }))
      .filter((repetition: any) => repetition.actionIds?.length > 0)
  );

  // Create a map of taskId to repetitions
  const taskIdToRepetitionsMap = new Map<number, TimelineRepetitionWithActions[]>();

  repetitions.forEach((repetition) => {
    const taskId = repetition.data?.properties?.a2ametadata?.taskId;
    if (taskId !== undefined && taskId !== null) {
      if (!taskIdToRepetitionsMap.has(taskId)) {
        taskIdToRepetitionsMap.set(taskId, []);
      }
      taskIdToRepetitionsMap.get(taskId)!.push(repetition);
    }
  });

  return taskIdToRepetitionsMap;
};
