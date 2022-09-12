import type { WorkflowState } from '../../../state/workflow/workflowInterfaces';
import type { WorkflowNode } from '../../models/workflowNode';
import { WORKFLOW_NODE_TYPES, WORKFLOW_EDGE_TYPES } from '@microsoft-logic-apps/utils';

export const initialState: WorkflowState = {
  graph: {
    id: 'root',
    children: [],
    edges: [],
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
  },
  operations: {},
  nodesMetadata: {},
  collapsedGraphIds: {},
  edgeIdsBySource: {},
  idReplacements: {},
};

const createMockNode = (id: string) => ({
  id,
  type: WORKFLOW_NODE_TYPES.OPERATION_NODE,
  height: 67,
  width: 200,
});

export const mockGraph: WorkflowNode = {
  id: 'root',
  type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
  children: [createMockNode('Manual'), createMockNode('Get_rows'), createMockNode('Initialize_variable'), createMockNode('Response')],
  edges: [
    {
      id: 'Manual-Get_rows',
      source: 'Manual',
      target: 'Get_rows',
      type: WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
    },
    {
      id: 'Get_rows-Response',
      source: 'Get_rows',
      target: 'Response',
      type: WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
    },
    {
      id: 'Response-Initialize_variable',
      source: 'Response',
      target: 'Initialize_variable',
      type: WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
    },
  ],
};
