import { describe, test, expect, beforeEach } from 'vitest';
import { workflowSlice } from '../workflowSlice';
import type { WorkflowState, NodeMetadata } from '../workflowInterfaces';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

describe('workflowSlice - setRepetitionRunData', () => {
  let initialState: WorkflowState;
  const nodeId = 'testNode';

  beforeEach(() => {
    const nodeMetadata: NodeMetadata = {
      graphId: 'graph1',
      parentNodeId: 'parent1',
      runData: {
        inputsLink: { contentSize: 100 },
        outputsLink: { contentSize: 200 },
        retryHistory: [],
        startTime: '2025-11-25T10:00:00Z',
        endTime: '2025-11-25T10:01:00Z',
        correlation: { actionTrackingId: 'track1', clientTrackingId: 'client1' },
        status: 'Failed',
        code: '500',
        error: {
          code: 'InternalServerError',
          message: 'An error occurred',
        },
      } as LogicAppsV2.WorkflowRunAction,
    };

    initialState = {
      graph: null,
      operations: {},
      nodesMetadata: {
        [nodeId]: nodeMetadata,
      },
      collapsedGraphIds: {},
      collapsedActionIds: {},
      idReplacements: {},
      newlyAddedOperations: {},
      runInstance: null,
      isDirty: false,
      workflowKind: undefined,
      originalDefinition: {} as LogicAppsV2.WorkflowDefinition,
      hostData: { errorMessages: {} },
      agentsGraph: {},
      timelineRepetitionIndex: 0,
      timelineRepetitionArray: [],
      flowErrors: {},
    } as WorkflowState;
  });

  test('should replace runData completely, removing stale error codes', () => {
    // Initial state has error code
    expect(initialState.nodesMetadata[nodeId].runData?.error?.code).toBe('InternalServerError');
    expect(initialState.nodesMetadata[nodeId].runData?.status).toBe('Failed');

    // New runData without error (successful run)
    const newRunData: LogicAppsV2.WorkflowRunAction = {
      inputsLink: { contentSize: 150 },
      outputsLink: { contentSize: 250 },
      retryHistory: [],
      startTime: '2025-11-25T10:02:00Z',
      endTime: '2025-11-25T10:03:00Z',
      correlation: { actionTrackingId: 'track2', clientTrackingId: 'client2' },
      status: 'Succeeded',
      code: '200',
      // No error property - should not persist from previous state
    } as LogicAppsV2.WorkflowRunAction;

    const newState = workflowSlice.reducer(initialState, workflowSlice.actions.setRepetitionRunData({ nodeId, runData: newRunData }));

    // Verify error is NOT carried over from previous state
    expect(newState.nodesMetadata[nodeId].runData?.error).toBeUndefined();
    expect(newState.nodesMetadata[nodeId].runData?.status).toBe('Succeeded');
    expect(newState.nodesMetadata[nodeId].runData?.code).toBe('200');
  });

  test('should set new error code when provided', () => {
    // Start with successful state
    const successState: WorkflowState = {
      ...initialState,
      nodesMetadata: {
        [nodeId]: {
          graphId: 'graph1',
          runData: {
            inputsLink: { contentSize: 100 },
            outputsLink: { contentSize: 200 },
            retryHistory: [],
            startTime: '2025-11-25T10:00:00Z',
            endTime: '2025-11-25T10:01:00Z',
            correlation: { actionTrackingId: 'track1', clientTrackingId: 'client1' },
            status: 'Succeeded',
            code: '200',
          } as LogicAppsV2.WorkflowRunAction,
        },
      },
    };

    // New runData with error
    const failedRunData: LogicAppsV2.WorkflowRunAction = {
      inputsLink: { contentSize: 150 },
      outputsLink: { contentSize: 250 },
      retryHistory: [],
      startTime: '2025-11-25T10:02:00Z',
      endTime: '2025-11-25T10:03:00Z',
      correlation: { actionTrackingId: 'track2', clientTrackingId: 'client2' },
      status: 'Failed',
      code: '400',
      error: {
        code: 'BadRequest',
        message: 'Invalid input',
      },
    } as LogicAppsV2.WorkflowRunAction;

    const newState = workflowSlice.reducer(successState, workflowSlice.actions.setRepetitionRunData({ nodeId, runData: failedRunData }));

    expect(newState.nodesMetadata[nodeId].runData?.error?.code).toBe('BadRequest');
    expect(newState.nodesMetadata[nodeId].runData?.error?.message).toBe('Invalid input');
    expect(newState.nodesMetadata[nodeId].runData?.status).toBe('Failed');
  });

  test('should preserve inputsLink and outputsLink as null when not provided', () => {
    const runDataWithoutLinks: LogicAppsV2.WorkflowRunAction = {
      retryHistory: [],
      startTime: '2025-11-25T10:02:00Z',
      endTime: '2025-11-25T10:03:00Z',
      correlation: { actionTrackingId: 'track2', clientTrackingId: 'client2' },
      status: 'Succeeded',
      code: '200',
      inputsLink: { contentSize: 0, uri: undefined },
      outputsLink: { contentSize: 0, uri: undefined },
    } as LogicAppsV2.WorkflowRunAction;

    const newState = workflowSlice.reducer(
      initialState,
      workflowSlice.actions.setRepetitionRunData({ nodeId, runData: runDataWithoutLinks })
    );

    expect(newState.nodesMetadata[nodeId].runData?.inputsLink).toBeNull();
    expect(newState.nodesMetadata[nodeId].runData?.outputsLink).toBeNull();
  });

  test('should calculate duration from startTime and endTime', () => {
    const runData: LogicAppsV2.WorkflowRunAction = {
      inputsLink: { contentSize: 100 },
      outputsLink: { contentSize: 200 },
      retryHistory: [],
      startTime: '2025-11-25T10:00:00Z',
      endTime: '2025-11-25T10:00:05Z', // 5 seconds
      correlation: { actionTrackingId: 'track1', clientTrackingId: 'client1' },
      status: 'Succeeded',
      code: '200',
    } as LogicAppsV2.WorkflowRunAction;

    const newState = workflowSlice.reducer(initialState, workflowSlice.actions.setRepetitionRunData({ nodeId, runData }));

    expect(newState.nodesMetadata[nodeId].runData?.duration).toBeDefined();
  });

  test('should do nothing when node metadata does not exist', () => {
    const nonExistentNodeId = 'nonExistentNode';
    const runData: LogicAppsV2.WorkflowRunAction = {
      inputsLink: { contentSize: 100 },
      outputsLink: { contentSize: 200 },
      retryHistory: [],
      startTime: '2025-11-25T10:00:00Z',
      endTime: '2025-11-25T10:01:00Z',
      correlation: { actionTrackingId: 'track1', clientTrackingId: 'client1' },
      status: 'Succeeded',
      code: '200',
    } as LogicAppsV2.WorkflowRunAction;

    const newState = workflowSlice.reducer(
      initialState,
      workflowSlice.actions.setRepetitionRunData({ nodeId: nonExistentNodeId, runData })
    );

    // State should remain unchanged
    expect(newState).toEqual(initialState);
    expect(newState.nodesMetadata[nonExistentNodeId]).toBeUndefined();
  });

  test('should update all runData properties without merging with previous state', () => {
    const newRunData: LogicAppsV2.WorkflowRunAction = {
      inputsLink: { contentSize: 300, uri: 'http://new-uri.com' },
      outputsLink: { contentSize: 400 },
      retryHistory: [{ startTime: '2025-11-25T10:01:30Z', endTime: '2025-11-25T10:01:35Z', code: '500' }],
      startTime: '2025-11-25T10:02:00Z',
      endTime: '2025-11-25T10:03:00Z',
      correlation: { actionTrackingId: 'newTrack', clientTrackingId: 'newClient' },
      status: 'Running',
      code: '202',
      repetitionCount: 5,
      iterationCount: 10,
    } as LogicAppsV2.WorkflowRunAction;

    const newState = workflowSlice.reducer(initialState, workflowSlice.actions.setRepetitionRunData({ nodeId, runData: newRunData }));

    const updatedRunData = newState.nodesMetadata[nodeId].runData as LogicAppsV2.WorkflowRunAction;

    // All new properties should be present
    expect(updatedRunData.status).toBe('Running');
    expect(updatedRunData.code).toBe('202');
    expect(updatedRunData.repetitionCount).toBe(5);
    expect(updatedRunData.iterationCount).toBe(10);
    expect(updatedRunData.correlation.actionTrackingId).toBe('newTrack');

    // Old error should NOT be present
    expect(updatedRunData.error).toBeUndefined();
  });
});
