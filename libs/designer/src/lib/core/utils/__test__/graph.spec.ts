import { WORKFLOW_NODE_TYPES } from '../../parsers/models/workflowNode';
import { createWorkflowEdge, createWorkflowNode, isRootNode } from '../graph';
import { SUBGRAPH_TYPES } from '@microsoft-logic-apps/utils';

describe('Graph Utilities', () => {
  const graph = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      createWorkflowNode('manual'),
      createWorkflowNode('firstAction'),
      createWorkflowNode('secondAction'),
      {
        id: 'condition',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [
          {
            id: 'condition-actions',
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            children: [
              createWorkflowNode('condition-actions-CONDITIONAL_TRUE', WORKFLOW_NODE_TYPES.SUBGRAPH_HEADER),
              createWorkflowNode('nestedOne'),
              createWorkflowNode('nestedTwo'),
            ],
            edges: [createWorkflowEdge('condition-actions-CONDITIONAL_TRUE', 'nestedOne'), createWorkflowEdge('nestedOne', 'nestedTwo')],
          },
          {
            id: 'condition-elseActions',
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            children: [createWorkflowNode('condition-elseActions-CONDITIONAL_FALSE', WORKFLOW_NODE_TYPES.SUBGRAPH_HEADER)],
            edges: [],
          },
        ],
      },
    ],
    edges: [
      createWorkflowEdge('manual', 'firstaction'),
      createWorkflowEdge('firstaction', 'secondaction'),
      createWorkflowEdge('secondaction', 'condition'),
    ],
  };
  const nodesMetadata = {
    manual: { graphId: 'root' },
    firstaction: { graphId: 'root' },
    secondaction: { graphId: 'root' },
    condition: { graphId: 'root' },
    'condition-actions-CONDITIONAL_TRUE': { graphId: 'condition-actions', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_TRUE },
    nestedone: { graphId: 'condition-actions' },
    nestedtwo: { graphId: 'condition-actions' },
    'condition-elseActions-CONDITIONAL_FALSE': { graphId: 'condition-elseActions', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_FALSE },
  };

  describe('isRootNode', () => {
    it('should return true for a trigger node in root graph', () => {
      expect(isRootNode(graph, 'manual', nodesMetadata)).toBeTruthy();
    });

    it('should return false for any action node in root graph', () => {
      expect(isRootNode(graph, 'secondaction', nodesMetadata)).toBeFalsy();
    });

    it('should return false for any action node in any other nested graph', () => {
      expect(isRootNode(graph, 'nestedone', nodesMetadata)).toBeFalsy();
      expect(isRootNode(graph, 'nestedtwo', nodesMetadata)).toBeFalsy();
    });
  });
});
