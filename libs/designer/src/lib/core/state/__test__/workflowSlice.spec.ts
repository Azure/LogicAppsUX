import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { initialState } from '../../parsers/__test__/mocks/workflowMock';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import { setStateAfterUndoRedo } from '../global';
import { WorkflowState } from '../workflow/workflowInterfaces';
import reducer, { addNode } from '../workflow/workflowSlice';

describe('workflow slice reducers', () => {
  it('should add initial node to the workflow', () => {
    const mockAddNode: AddNodePayload = {
      nodeId: '123',
      relationshipIds: {
        graphId: 'root',
      },
      operation: {
        id: 'test-id',
        name: 'test-name',
        properties: {
          trigger: 'test-trigger',
        } as any,
        type: 'discovery',
      },
    };
    const state = reducer(initialState, addNode(mockAddNode));
    expect(state.graph?.children).toEqual([
      {
        id: '123',
        height: 40,
        width: 200,
        type: WORKFLOW_NODE_TYPES.OPERATION_NODE,
      },
    ]);
    expect(state.nodesMetadata).toEqual({
      '123': {
        graphId: 'root',
        isRoot: true,
      },
    });
  });

  it('should set workflow state on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const workflowState: WorkflowState = {
      ...undoRedoPartialRootState.workflow,
      operations: {
        mockOperation: {
          type: 'built-in',
        },
      },
      graph: {
        id: 'root',
        type: 'GRAPH_NODE',
      },
    };
    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        workflow: workflowState,
      })
    );

    expect(state).toEqual(workflowState);
  });
});
