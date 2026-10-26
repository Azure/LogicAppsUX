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
      changeCount: 0,
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
    } as unknown as LogicAppsV2.WorkflowRunAction;

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

describe('workflowSlice - replaceOperationDefinition', () => {
  const nodeId = 'testNode';

  const buildState = (operations: Record<string, any>): WorkflowState =>
    ({
      graph: null,
      operations,
      nodesMetadata: {},
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
      changeCount: 0,
      timelineRepetitionArray: [],
      flowErrors: {},
    }) as WorkflowState;

  test('should replace the operation definition for an existing node', () => {
    const initialState = buildState({
      [nodeId]: { type: 'InitializeVariable', inputs: { variables: [{ name: 'old', type: 'String', value: 'a' }] } },
    });

    const operationDefinition = {
      type: 'InitializeVariable',
      inputs: { variables: [{ name: 'renamed', type: 'String', value: 'b' }] },
    } as unknown as LogicAppsV2.OperationDefinition;

    const newState = workflowSlice.reducer(initialState, workflowSlice.actions.replaceOperationDefinition({ nodeId, operationDefinition }));

    expect(newState.operations[nodeId]).toEqual(operationDefinition);
    expect(newState.isDirty).toBe(true);
  });

  test('should no-op when the node does not exist', () => {
    const initialState = buildState({});

    const operationDefinition = { type: 'Compose', inputs: {} } as unknown as LogicAppsV2.OperationDefinition;

    const newState = workflowSlice.reducer(
      initialState,
      workflowSlice.actions.replaceOperationDefinition({ nodeId: 'missing', operationDefinition })
    );

    expect(newState.operations['missing']).toBeUndefined();
  });
});

describe('workflowSlice - replaceOperationDefinition runAfter graph reconciliation', () => {
  // Linear top-level workflow: manual (trigger) -> A -> B -> C
  const buildLinearState = (): WorkflowState =>
    ({
      graph: {
        id: 'root',
        type: 'GRAPH_NODE',
        children: [
          { id: 'manual', type: 'OPERATION_NODE' },
          { id: 'A', type: 'OPERATION_NODE' },
          { id: 'B', type: 'OPERATION_NODE' },
          { id: 'C', type: 'OPERATION_NODE' },
        ],
        edges: [
          { id: 'manual-A', source: 'manual', target: 'A', type: 'BUTTON_EDGE' },
          { id: 'A-B', source: 'A', target: 'B', type: 'BUTTON_EDGE' },
          { id: 'B-C', source: 'B', target: 'C', type: 'BUTTON_EDGE' },
        ],
      },
      operations: {
        manual: { type: 'Request', kind: 'Http' },
        A: { type: 'Compose', inputs: {} },
        B: { type: 'Compose', inputs: {}, runAfter: { A: ['Succeeded'] } },
        C: { type: 'Compose', inputs: {}, runAfter: { B: ['Succeeded'] } },
      },
      nodesMetadata: {
        manual: { graphId: 'root', isRoot: true, isTrigger: true } as NodeMetadata,
        A: { graphId: 'root' } as NodeMetadata,
        B: { graphId: 'root' } as NodeMetadata,
        C: { graphId: 'root' } as NodeMetadata,
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
      changeCount: 0,
      timelineRepetitionArray: [],
      flowErrors: {},
    }) as unknown as WorkflowState;

  const edgeIds = (state: WorkflowState) => (state.graph?.edges ?? []).map((edge) => edge.id).sort();

  test('removing runAfter on a top-level node re-attaches it to the trigger', () => {
    const initialState = buildLinearState();

    const operationDefinition = { type: 'Compose', inputs: {} } as unknown as LogicAppsV2.OperationDefinition;

    const newState = workflowSlice.reducer(
      initialState,
      workflowSlice.actions.replaceOperationDefinition({ nodeId: 'C', operationDefinition })
    );

    // The B->C edge is gone and a trigger->C edge is created.
    expect(edgeIds(newState)).toEqual(['A-B', 'manual-A', 'manual-C']);
  });

  test('changing the runAfter parent moves the edge to the new parent', () => {
    const initialState = buildLinearState();

    const operationDefinition = {
      type: 'Compose',
      inputs: {},
      runAfter: { A: ['Succeeded'] },
    } as unknown as LogicAppsV2.OperationDefinition;

    const newState = workflowSlice.reducer(
      initialState,
      workflowSlice.actions.replaceOperationDefinition({ nodeId: 'C', operationDefinition })
    );

    // C now runs after A instead of B: B->C replaced with A->C.
    expect(edgeIds(newState)).toEqual(['A-B', 'A-C', 'manual-A']);
  });

  test('status-only runAfter changes do not alter the edges', () => {
    const initialState = buildLinearState();

    const operationDefinition = {
      type: 'Compose',
      inputs: {},
      runAfter: { B: ['Failed'] },
    } as unknown as LogicAppsV2.OperationDefinition;

    const newState = workflowSlice.reducer(
      initialState,
      workflowSlice.actions.replaceOperationDefinition({ nodeId: 'C', operationDefinition })
    );

    expect(edgeIds(newState)).toEqual(['A-B', 'B-C', 'manual-A']);
  });
});
