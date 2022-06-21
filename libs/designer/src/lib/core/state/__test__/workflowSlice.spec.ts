import { initialState } from '../../parsers/__test__/mocks/workflowMock';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import reducer, { addNode } from '../workflowSlice';

describe('workflow slice reducers', () => {
  it('should add initial node to the workflow', () => {
    const mockAddNode: AddNodePayload = {
      id: '123',
      graphId: 'root',
    };
    const state = reducer(initialState, addNode(mockAddNode));
    expect(state.graph?.children).toEqual([
      {
        height: 67,
        id: '123',
        width: 200,
      },
    ]);
    expect(state.nodesMetadata).toEqual({
      '123': {
        graphId: 'root',
      },
    });
  });
});
