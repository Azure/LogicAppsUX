import type { TimelineRepetition } from './hooks';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

export const parseRepetitions = (
  repetitionData: TimelineRepetition[] | undefined,
  runInstance: LogicAppsV2.RunInstanceDefinition | null
): {
  actionIds: string[] | undefined;
  repetitionIndex: number;
  data?: TimelineRepetition;
}[] => {
  if ((repetitionData ?? []).length === 0) {
    return [];
  }

  // Add trigger (not a repetition)
  const triggerId = runInstance?.properties?.trigger?.name ?? '';
  const trigger = runInstance?.properties?.trigger as LogicAppsV2.WorkflowRunTrigger;
  const output = [
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
  output.push(
    ...(repetitionData ?? [])
      .map((repetition: any) => ({
        actionIds: Object.keys(repetition.properties.actions ?? {}),
        repetitionIndex: Number(repetition.name),
        data: repetition,
      }))
      .filter((repetition: any) => repetition.actionIds?.length > 0)
  );
  return output;
};
