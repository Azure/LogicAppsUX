import type { WorkflowState } from '../../../state/workflowSlice';
import type { WorkflowGraph } from '../workflowNode';

export const initialState: WorkflowState = {
  graph: {
    id: 'root',
    children: [],
    edges: [],
  },
  operations: {},
  nodesMetadata: {},
};

export const mockGraph: WorkflowGraph = {
  id: 'root',
  children: [
    {
      id: 'manual',
      height: 67,
      width: 200,
    },
    {
      id: 'Get_rows',
      height: 67,
      width: 200,
    },
    {
      id: 'Initialize_variable',
      height: 102,
      width: 200,
    },
    {
      id: 'Response',
      height: 67,
      width: 200,
    },
  ],
  edges: [
    {
      id: 'manual-Get_rows',
      source: 'manual',
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
