import type { WorkflowState } from '../../../state/workflowSlice';
import type { WorkflowNode, WorkflowNodeType } from '../../models/workflowNode';

export const initialState: WorkflowState = {
  graph: {
    id: 'root',
    children: [],
    edges: [],
    type: 'graphNode',
  },
  operations: {},
  nodesMetadata: {},
};

const createMockNode = (id: string) => ({
  id,
  type: 'testNode' as WorkflowNodeType,
  height: 67,
  width: 200,
});

export const mockGraph: WorkflowNode = {
  id: 'root',
  type: 'graphNode',
  children: [createMockNode('Manual'), createMockNode('Get_rows'), createMockNode('Initialize_variable'), createMockNode('Response')],
  edges: [
    {
      id: 'Manual-Get_rows',
      source: 'Manual',
      target: 'Get_rows',
    },
    {
      id: 'Get_rows-Response',
      source: 'Get_rows',
      target: 'Response',
    },
    {
      id: 'Response-Initialize_variable',
      source: 'Response',
      target: 'Initialize_variable',
    },
  ],
};
