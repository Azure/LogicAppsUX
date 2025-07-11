import { describe, it, expect, beforeEach } from 'vitest';
import { parseRepetitions } from '../helpers';
import type { TimelineRepetition } from '../hooks';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

describe('helpers', () => {
  describe('parseRepetitions', () => {
    let mockRunInstance: LogicAppsV2.RunInstanceDefinition;
    let mockRepetitionData: TimelineRepetition[];

    beforeEach(() => {
      mockRunInstance = {
        id: 'run-123',
        name: 'test-run',
        properties: {
          trigger: {
            name: 'manual-trigger',
            startTime: '2024-01-01T00:00:00Z',
            status: 'succeeded',
            canResubmit: true,
            correlation: 'correlation-123',
          },
        },
      } as LogicAppsV2.RunInstanceDefinition;

      mockRepetitionData = [
        {
          id: 'rep-1',
          name: '1',
          properties: {
            actions: {
              'action-1': {
                status: 'succeeded',
              },
            },
            canResubmit: false,
            correlation: 'correlation-1',
            startTime: '2024-01-01T01:00:00Z',
            status: 'succeeded',
            a2ametadata: {
              taskId: 1,
            },
          },
          type: 'repetition',
        },
        {
          id: 'rep-2',
          name: '2',
          properties: {
            actions: {
              'action-2': {
                status: 'failed',
              },
            },
            canResubmit: true,
            correlation: 'correlation-2',
            startTime: '2024-01-01T02:00:00Z',
            status: 'failed',
            a2ametadata: {
              taskId: 2,
            },
          },
          type: 'repetition',
        },
        {
          id: 'rep-3',
          name: '3',
          properties: {
            actions: {
              'action-3a': {
                status: 'succeeded',
              },
              'action-3b': {
                status: 'succeeded',
              },
            },
            canResubmit: false,
            correlation: 'correlation-3',
            startTime: '2024-01-01T03:00:00Z',
            status: 'succeeded',
            a2ametadata: {
              taskId: 1, // Same taskId as rep-1
            },
          },
          type: 'repetition',
        },
      ] as TimelineRepetition[];
    });

    it('should return empty map when repetition data is undefined', () => {
      const result = parseRepetitions(undefined, mockRunInstance);
      expect(result).toEqual(new Map());
    });

    it('should return empty map when repetition data is empty array', () => {
      const result = parseRepetitions([], mockRunInstance);
      expect(result).toEqual(new Map());
    });

    it('should create trigger entry with taskId 0', () => {
      const result = parseRepetitions([], mockRunInstance);
      expect(result.size).toBe(0); // Empty array should return empty map

      const resultWithData = parseRepetitions(mockRepetitionData, mockRunInstance);
      const triggerGroup = resultWithData.get(0);

      expect(triggerGroup).toBeDefined();
      expect(triggerGroup).toHaveLength(1);
      expect(triggerGroup![0].repetitionIndex).toBe(-1);
      expect(triggerGroup![0].actionIds).toEqual(['manual-trigger']);
      expect(triggerGroup![0].data?.properties.a2ametadata?.taskId).toBe(0);
    });

    it('should parse repetitions and group by taskId', () => {
      const result = parseRepetitions(mockRepetitionData, mockRunInstance);

      // Should have 3 groups: trigger (taskId 0), taskId 1, taskId 2
      expect(result.size).toBe(3);

      // Check trigger group (taskId 0)
      const triggerGroup = result.get(0);
      expect(triggerGroup).toHaveLength(1);
      expect(triggerGroup![0].repetitionIndex).toBe(-1);

      // Check taskId 1 group (should have 2 repetitions: rep-1 and rep-3)
      const task1Group = result.get(1);
      expect(task1Group).toHaveLength(2);
      expect(task1Group![0].repetitionIndex).toBe(1);
      expect(task1Group![1].repetitionIndex).toBe(3);

      // Check taskId 2 group (should have 1 repetition: rep-2)
      const task2Group = result.get(2);
      expect(task2Group).toHaveLength(1);
      expect(task2Group![0].repetitionIndex).toBe(2);
    });

    it('should extract action IDs correctly', () => {
      const result = parseRepetitions(mockRepetitionData, mockRunInstance);

      const task1Group = result.get(1)!;
      expect(task1Group[0].actionIds).toEqual(['action-1']);
      expect(task1Group[1].actionIds).toEqual(['action-3a', 'action-3b']);

      const task2Group = result.get(2)!;
      expect(task2Group[0].actionIds).toEqual(['action-2']);
    });

    it('should handle missing trigger in run instance', () => {
      const runInstanceNoTrigger = {
        id: 'run-123',
        name: 'test-run',
        properties: {},
      } as LogicAppsV2.RunInstanceDefinition;

      const result = parseRepetitions(mockRepetitionData, runInstanceNoTrigger);

      const triggerGroup = result.get(0);
      expect(triggerGroup).toHaveLength(1);
      expect(triggerGroup![0].actionIds).toEqual(['']);
      expect(triggerGroup![0].data?.properties.status).toBe('Unknown');
    });

    it('should handle null run instance', () => {
      const result = parseRepetitions(mockRepetitionData, null);

      const triggerGroup = result.get(0);
      expect(triggerGroup).toHaveLength(1);
      expect(triggerGroup![0].actionIds).toEqual(['']);
    });

    it('should filter out repetitions with no actions', () => {
      const repetitionsWithEmptyActions = [
        ...mockRepetitionData,
        {
          id: 'rep-empty',
          name: '4',
          properties: {
            actions: {},
            canResubmit: false,
            correlation: 'correlation-empty',
            startTime: '2024-01-01T04:00:00Z',
            status: 'succeeded',
            a2ametadata: {
              taskId: 3,
            },
          },
          type: 'repetition',
        },
      ] as TimelineRepetition[];

      const result = parseRepetitions(repetitionsWithEmptyActions, mockRunInstance);

      // Should not include the empty actions repetition
      expect(result.has(3)).toBe(false);
      expect(result.size).toBe(3); // Only trigger, task1, task2
    });

    it('should handle repetitions with undefined taskId', () => {
      const repetitionsWithUndefinedTaskId = [
        {
          id: 'rep-no-task',
          name: '1',
          properties: {
            actions: {
              'action-1': {
                status: 'succeeded',
              },
            },
            canResubmit: false,
            correlation: 'correlation-1',
            startTime: '2024-01-01T01:00:00Z',
            status: 'succeeded',
            // No a2ametadata
          },
          type: 'repetition',
        },
      ] as TimelineRepetition[];

      const result = parseRepetitions(repetitionsWithUndefinedTaskId, mockRunInstance);

      // Should only have trigger group
      expect(result.size).toBe(1);
      expect(result.has(0)).toBe(true); // Trigger
    });

    it('should preserve original data structure in parsed repetitions', () => {
      const result = parseRepetitions(mockRepetitionData, mockRunInstance);

      const task1Group = result.get(1)!;
      const firstRepetition = task1Group[0];

      expect(firstRepetition.data).toEqual(mockRepetitionData[0]);
      expect(firstRepetition.data?.id).toBe('rep-1');
      expect(firstRepetition.data?.name).toBe('1');
      expect(firstRepetition.data?.type).toBe('repetition');
    });

    it('should create trigger data structure correctly', () => {
      const result = parseRepetitions(mockRepetitionData, mockRunInstance);

      const triggerGroup = result.get(0)!;
      const trigger = triggerGroup[0];

      expect(trigger.data?.id).toBe('manual-trigger');
      expect(trigger.data?.name).toBe('manual-trigger');
      expect(trigger.data?.type).toBe('trigger');
      expect(trigger.data?.properties.actions).toHaveProperty('manual-trigger');
      expect(trigger.data?.properties.a2ametadata?.taskId).toBe(0);
    });
  });
});
