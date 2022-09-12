import { initialState } from '../../parsers/__test__/mocks/workflowMock';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import reducer, { addNode } from '../workflow/workflowSlice';
import { WORKFLOW_NODE_TYPES } from '@microsoft-logic-apps/utils';

describe('workflow slice reducers', () => {
  it('should add initial node to the workflow', () => {
    const mockAddNode: AddNodePayload = {
      nodeId: '123',
      discoveryIds: {
        graphId: 'root',
      },
      operation: {
        id: 'test-id',
        name: 'test-name',
        properties: {} as any,
        type: 'discovery',
      },
    };
    const state = reducer(initialState, addNode(mockAddNode));
    expect(state.graph?.children).toEqual([
      {
        id: '123',
        height: 67,
        width: 200,
        type: WORKFLOW_NODE_TYPES.OPERATION_NODE,
      },
    ]);
    expect(state.nodesMetadata).toEqual({
      '123': {
        graphId: 'root',
      },
    });
  });
});
