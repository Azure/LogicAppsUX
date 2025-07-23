import { describe, it, expect, beforeEach } from 'vitest';
import { parseRepetitions } from '../helpers';
import type { TimelineRepetition } from '../hooks';

describe('helpers', () => {
  describe('parseRepetitions', () => {
    let mockRepetitionData: TimelineRepetition[];

    beforeEach(() => {
      mockRepetitionData = [
        {
          id: 'workflows/workflowId/runs/runId/repetitions/0',
          name: '0',
          properties: {
            agentMetadata: {
              taskSequenceId: 'task-seq-1',
              agentName: 'agent-1',
            },
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-1',
              clientTrackingId: 'client-tracking-1',
            },
            startTime: '2024-01-01T01:00:00Z',
            status: 'succeeded',
            code: '200',
          },
          type: 'repetition',
        },
        {
          id: 'workflows/workflowId/runs/runId/repetitions/1',
          name: '1',
          properties: {
            agentMetadata: {
              taskSequenceId: 'task-seq-2',
              agentName: 'agent-2',
            },
            canResubmit: true,
            correlation: {
              actionTrackingId: 'action-tracking-2',
              clientTrackingId: 'client-tracking-2',
            },
            startTime: '2024-01-01T02:00:00Z',
            status: 'failed',
            code: '500',
          },
          type: 'repetition',
        },
        {
          id: 'workflows/workflowId/runs/runId/repetitions/2',
          name: '2',
          properties: {
            agentMetadata: {
              taskSequenceId: 'task-seq-1', // Same taskSequenceId as first repetition
              agentName: 'agent-1',
            },
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-3',
              clientTrackingId: 'client-tracking-3',
            },
            startTime: '2024-01-01T03:00:00Z',
            status: 'succeeded',
            code: '200',
          },
          type: 'repetition',
        },
      ] as TimelineRepetition[];
    });

    it('should return empty map when repetition data is undefined', () => {
      const result = parseRepetitions(undefined);
      expect(result).toEqual(new Map());
    });

    it('should return empty map when repetition data is empty array', () => {
      const result = parseRepetitions([]);
      expect(result).toEqual(new Map());
    });

    it('should parse repetitions and group by taskSequenceId', () => {
      const result = parseRepetitions(mockRepetitionData);

      // Should have 2 groups: task-seq-1 and task-seq-2
      expect(result.size).toBe(2);

      // Check first group (task-seq-1) - should have 2 repetitions (index 0 and 2)
      const firstGroup = result.get(0);
      expect(firstGroup).toBeDefined();
      expect(firstGroup).toHaveLength(2);
      expect(firstGroup![0].repetitionIndex).toBe(0);
      expect(firstGroup![1].repetitionIndex).toBe(2);
      expect(firstGroup![0].data?.properties.agentMetadata.taskSequenceId).toBe('task-seq-1');
      expect(firstGroup![1].data?.properties.agentMetadata.taskSequenceId).toBe('task-seq-1');

      // Check second group (task-seq-2) - should have 1 repetition (index 1)
      const secondGroup = result.get(1);
      expect(secondGroup).toBeDefined();
      expect(secondGroup).toHaveLength(1);
      expect(secondGroup![0].repetitionIndex).toBe(1);
      expect(secondGroup![0].data?.properties.agentMetadata.taskSequenceId).toBe('task-seq-2');
    });

    it('should extract repetition index from id correctly', () => {
      const result = parseRepetitions(mockRepetitionData);

      const firstGroup = result.get(0)!;
      const secondGroup = result.get(1)!;

      // Check that repetition indexes are extracted from the id path
      expect(firstGroup[0].repetitionIndex).toBe(0); // from 'workflows/.../repetitions/0'
      expect(firstGroup[1].repetitionIndex).toBe(2); // from 'workflows/.../repetitions/2'
      expect(secondGroup[0].repetitionIndex).toBe(1); // from 'workflows/.../repetitions/1'
    });

    it('should preserve original data structure in parsed repetitions', () => {
      const result = parseRepetitions(mockRepetitionData);

      const firstGroup = result.get(0)!;
      const firstRepetition = firstGroup[0];

      expect(firstRepetition.data).toEqual(mockRepetitionData[0]);
      expect(firstRepetition.data?.id).toBe('workflows/workflowId/runs/runId/repetitions/0');
      expect(firstRepetition.data?.name).toBe('0');
      expect(firstRepetition.data?.type).toBe('repetition');
      expect(firstRepetition.data?.properties.agentMetadata.agentName).toBe('agent-1');
    });

    it('should handle repetitions with missing taskSequenceId', () => {
      const repetitionsWithMissingTaskId = [
        {
          id: 'workflows/workflowId/runs/runId/repetitions/0',
          name: '0',
          properties: {
            agentMetadata: {
              taskSequenceId: 'task-seq-1',
              agentName: 'agent-1',
            },
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-1',
              clientTrackingId: 'client-tracking-1',
            },
            startTime: '2024-01-01T01:00:00Z',
            status: 'succeeded',
            code: '200',
          },
          type: 'repetition',
        },
        {
          id: 'workflows/workflowId/runs/runId/repetitions/1',
          name: '1',
          properties: {
            // Missing agentMetadata
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-2',
              clientTrackingId: 'client-tracking-2',
            },
            startTime: '2024-01-01T02:00:00Z',
            status: 'succeeded',
            code: '200',
          },
          type: 'repetition',
        },
      ] as unknown as TimelineRepetition[];

      const result = parseRepetitions(repetitionsWithMissingTaskId);

      // Should only include the repetition with valid taskSequenceId
      expect(result.size).toBe(1);
      const firstGroup = result.get(0)!;
      expect(firstGroup).toHaveLength(1);
      expect(firstGroup[0].data?.properties.agentMetadata.taskSequenceId).toBe('task-seq-1');
    });

    it('should handle repetitions with different id formats', () => {
      const repetitionsWithDifferentIds = [
        {
          id: 'simple-id/5',
          name: '5',
          properties: {
            agentMetadata: {
              taskSequenceId: 'task-seq-1',
              agentName: 'agent-1',
            },
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-1',
              clientTrackingId: 'client-tracking-1',
            },
            startTime: '2024-01-01T01:00:00Z',
            status: 'succeeded',
            code: '200',
          },
          type: 'repetition',
        },
        {
          id: 'no-slash-id',
          name: 'no-slash-id',
          properties: {
            agentMetadata: {
              taskSequenceId: 'task-seq-2',
              agentName: 'agent-2',
            },
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-2',
              clientTrackingId: 'client-tracking-2',
            },
            startTime: '2024-01-01T02:00:00Z',
            status: 'succeeded',
            code: '200',
          },
          type: 'repetition',
        },
      ] as TimelineRepetition[];

      const result = parseRepetitions(repetitionsWithDifferentIds);

      expect(result.size).toBe(2);

      const firstGroup = result.get(0)!;
      const secondGroup = result.get(1)!;

      // Should extract '5' from 'simple-id/5'
      expect(firstGroup[0].repetitionIndex).toBe(5);

      // Should use 'no-slash-id' as is, converted to NaN then 0
      expect(Number.isNaN(secondGroup[0].repetitionIndex)).toBe(true);
    });

    it('should handle multiple repetitions with the same taskSequenceId', () => {
      const repetitionsWithSameTaskId = [
        {
          id: 'workflows/workflowId/runs/runId/repetitions/0',
          name: '0',
          properties: {
            agentMetadata: {
              taskSequenceId: 'shared-task-id',
              agentName: 'agent-1',
            },
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-1',
              clientTrackingId: 'client-tracking-1',
            },
            startTime: '2024-01-01T01:00:00Z',
            status: 'succeeded',
            code: '200',
          },
          type: 'repetition',
        },
        {
          id: 'workflows/workflowId/runs/runId/repetitions/1',
          name: '1',
          properties: {
            agentMetadata: {
              taskSequenceId: 'shared-task-id',
              agentName: 'agent-1',
            },
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-2',
              clientTrackingId: 'client-tracking-2',
            },
            startTime: '2024-01-01T02:00:00Z',
            status: 'failed',
            code: '500',
          },
          type: 'repetition',
        },
        {
          id: 'workflows/workflowId/runs/runId/repetitions/2',
          name: '2',
          properties: {
            agentMetadata: {
              taskSequenceId: 'shared-task-id',
              agentName: 'agent-1',
            },
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-3',
              clientTrackingId: 'client-tracking-3',
            },
            startTime: '2024-01-01T03:00:00Z',
            status: 'succeeded',
            code: '200',
          },
          type: 'repetition',
        },
      ] as TimelineRepetition[];

      const result = parseRepetitions(repetitionsWithSameTaskId);

      // Should have only 1 group since all repetitions have the same taskSequenceId
      expect(result.size).toBe(1);

      const group = result.get(0)!;
      expect(group).toHaveLength(3);
      expect(group[0].repetitionIndex).toBe(0);
      expect(group[1].repetitionIndex).toBe(1);
      expect(group[2].repetitionIndex).toBe(2);

      // All should have the same taskSequenceId
      group.forEach((rep) => {
        expect(rep.data?.properties.agentMetadata.taskSequenceId).toBe('shared-task-id');
      });
    });

    it('should create sequential numbered map keys regardless of taskSequenceId values', () => {
      const repetitionsWithRandomTaskIds = [
        {
          id: 'workflows/workflowId/runs/runId/repetitions/0',
          name: '0',
          properties: {
            agentMetadata: {
              taskSequenceId: 'zzz-last-alphabetically',
              agentName: 'agent-1',
            },
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-1',
              clientTrackingId: 'client-tracking-1',
            },
            startTime: '2024-01-01T01:00:00Z',
            status: 'succeeded',
            code: '200',
          },
          type: 'repetition',
        },
        {
          id: 'workflows/workflowId/runs/runId/repetitions/1',
          name: '1',
          properties: {
            agentMetadata: {
              taskSequenceId: 'aaa-first-alphabetically',
              agentName: 'agent-2',
            },
            canResubmit: false,
            correlation: {
              actionTrackingId: 'action-tracking-2',
              clientTrackingId: 'client-tracking-2',
            },
            startTime: '2024-01-01T02:00:00Z',
            status: 'succeeded',
            code: '200',
          },
          type: 'repetition',
        },
      ] as TimelineRepetition[];

      const result = parseRepetitions(repetitionsWithRandomTaskIds);

      // Should have keys 0 and 1, regardless of the actual taskSequenceId values
      expect(result.size).toBe(2);
      expect(result.has(0)).toBe(true);
      expect(result.has(1)).toBe(true);

      // The order should be based on the order they appear in the iteration
      const firstGroup = result.get(0)!;
      const secondGroup = result.get(1)!;

      expect(firstGroup[0].data?.properties.agentMetadata.taskSequenceId).toBe('zzz-last-alphabetically');
      expect(secondGroup[0].data?.properties.agentMetadata.taskSequenceId).toBe('aaa-first-alphabetically');
    });
  });
});
