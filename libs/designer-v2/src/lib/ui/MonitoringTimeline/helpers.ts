import type { TimelineRepetition } from './hooks';

export interface TimelineRepetitionWithActions {
  repetitionIndex: number;
  data?: TimelineRepetition;
}

export const parseRepetitions = (repetitionData: TimelineRepetition[] | undefined): Map<number, TimelineRepetitionWithActions[]> => {
  if ((repetitionData ?? []).length === 0) {
    return new Map();
  }

  const repetitions = [];

  // Add all repetitions
  repetitions.push(
    ...(repetitionData ?? []).map((repetition: TimelineRepetition) => {
      const repetitionName = repetition.id.split('/').pop();
      return {
        repetitionIndex: Number(repetitionName),
        data: repetition,
      };
    })
  );

  // Create a map of taskId to repetitions
  const taskIdToRepetitionsMap = new Map<string, TimelineRepetitionWithActions[]>();

  repetitions.forEach((repetition) => {
    const taskId = repetition.data?.properties.agentMetadata?.taskSequenceId;
    if (taskId) {
      const existingRepetitions = taskIdToRepetitionsMap.get(taskId) ?? [];
      taskIdToRepetitionsMap.set(taskId, [...existingRepetitions, repetition]);
    }
  });

  // Transform the map to use numeric keys from 0 to n-1
  const numberedMap = new Map<number, TimelineRepetitionWithActions[]>();
  let index = 0;

  taskIdToRepetitionsMap.forEach((repetitions) => {
    numberedMap.set(index, repetitions);
    index++;
  });

  return numberedMap;
};
