import { WORKFLOW_NODE_TYPES } from '../../parsers/models/workflowNode';
import { createWorkflowEdge, createWorkflowNode, isRootNode, getAllNodesInsideNode, getUpstreamNodeIds, isRootNodeInGraph } from '../graph';

describe('Graph Utilities', () => {
  const graph = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      createWorkflowNode('manual'),
      createWorkflowNode('Compose'),
      createWorkflowNode('Compose_11'),
      createWorkflowNode('Compose_2'),
      createWorkflowNode('Execute_a_navigation_plan'),
      createWorkflowNode('Response'),
      {
        id: 'Scope',
        width: 200,
        height: 40,
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [
          createWorkflowNode('Scope-#scope', WORKFLOW_NODE_TYPES.SCOPE_NODE),
          createWorkflowNode('Compose_10'),
          createWorkflowNode('Compose_3'),
          createWorkflowNode('Compose_4'),
          createWorkflowNode('Compose_5'),
          createWorkflowNode('Compose_6'),
          {
            id: 'Scope_2',
            width: 200,
            height: 40,
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            children: [
              createWorkflowNode('Scope_2-#scope', WORKFLOW_NODE_TYPES.SCOPE_NODE),
              createWorkflowNode('Compose_7'),
              createWorkflowNode('Compose_8'),
              createWorkflowNode('Compose_9'),
            ],
            edges: [
              createWorkflowEdge('Compose_7', 'Compose_8'),
              createWorkflowEdge('Compose_7', 'Compose_9'),
              createWorkflowEdge('Scope_2-#scope', 'Compose_7'),
            ],
          },
        ],
        edges: [
          createWorkflowEdge('Scope_2', 'Compose_10'),
          createWorkflowEdge('Compose_3', 'Compose_4'),
          createWorkflowEdge('Compose_3', 'Compose_5'),
          createWorkflowEdge('Compose_4', 'Compose_6'),
          createWorkflowEdge('Compose_5', 'Scope_2'),
          createWorkflowEdge('Scope-#scope', 'Compose_10'),
        ],
      },
    ],
    edges: [
      createWorkflowEdge('manual', 'Compose'),
      createWorkflowEdge('manual', 'Execute_a_navigation_plan'),
      createWorkflowEdge('Scope', 'Compose_11'),
      createWorkflowEdge('Compose', 'Compose_2'),
      createWorkflowEdge('Execute_a_navigation_plan', 'Response'),
      createWorkflowEdge('Response', 'Scope'),
    ],
  };

  const nodesMetadata = {
    manual: { graphId: 'root', isRoot: true },
    Compose: { graphId: 'root' },
    Compose_11: { graphId: 'root' },
    Compose_2: { graphId: 'root' },
    Execute_a_navigation_plan: { graphId: 'root' },
    Response: { graphId: 'root' },
    Scope: { graphId: 'root' },
    Compose_10: { graphId: 'Scope', parentNodeId: 'Scope', isRoot: true },
    Compose_3: { graphId: 'Scope', parentNodeId: 'Scope' },
    Compose_4: { graphId: 'Scope', parentNodeId: 'Scope' },
    Compose_5: { graphId: 'Scope', parentNodeId: 'Scope' },
    Compose_6: { graphId: 'Scope', parentNodeId: 'Scope' },
    Scope_2: { graphId: 'Scope', parentNodeId: 'Scope' },
    Compose_7: { graphId: 'Scope_2', parentNodeId: 'Scope_2', isRoot: true },
    Compose_8: { graphId: 'Scope_2', parentNodeId: 'Scope_2' },
    Compose_9: { graphId: 'Scope_2', parentNodeId: 'Scope_2' },
  };

  const operationMap = {
    manual: 'manual',
    Compose: 'Compose',
    Compose_11: 'Compose_11',
    Compose_2: 'Compose_2',
    Execute_a_navigation_plan: 'Execute_a_navigation_plan',
    Response: 'Response',
    Scope: 'Scope',
    Compose_10: 'Compose_10',
    Compose_3: 'Compose_3',
    Compose_4: 'Compose_4',
    Compose_5: 'Compose_5',
    Compose_6: 'Compose_6',
    Scope_2: 'Scope_2',
    Compose_7: 'Compose_7',
    Compose_8: 'Compose_8',
    Compose_9: 'Compose_9',
  };

  describe('isRootNode', () => {
    it('should return true for a trigger node in root graph', () => {
      expect(isRootNode('manual', nodesMetadata)).toBeTruthy();
    });

    it('should return false for any action node in root graph', () => {
      expect(isRootNode('Compose_2', nodesMetadata)).toBeFalsy();
    });

    it('should return true for the first node in a graph', () => {
      expect(isRootNode('Compose_10', nodesMetadata)).toBeTruthy();
      expect(isRootNode('Compose_3', nodesMetadata)).toBeFalsy();
    });
  });

  describe('isRootNodeInGraph', () => {
    it('should return true for a trigger node in root graph', () => {
      expect(isRootNodeInGraph('manual', 'root', nodesMetadata)).toBeTruthy();
    });

    it('should return false for any action node in root graph or any root node in nested graph', () => {
      expect(isRootNodeInGraph('Compose_2', 'root', nodesMetadata)).toBeFalsy();
      expect(isRootNodeInGraph('Compose_10', 'root', nodesMetadata)).toBeFalsy();
      expect(isRootNodeInGraph('Compose_3', 'root', nodesMetadata)).toBeFalsy();
    });
  });

  describe('getAllNodesInsideNode', () => {
    it('should return all children for a workflow graph node which are operations', () => {
      expect(getAllNodesInsideNode('Scope_2', graph, operationMap)).toEqual(['Compose_7', 'Compose_8', 'Compose_9']);
    });

    it('should return empty for a node which is not workflow graph', () => {
      expect(getAllNodesInsideNode('Compose_6', graph, operationMap)).toEqual([]);
    });

    it('should return all nested children as well for a workflow graph containing nested actions', () => {
      expect(getAllNodesInsideNode('Scope', graph, operationMap)).toEqual([
        'Compose_10',
        'Compose_3',
        'Compose_4',
        'Compose_5',
        'Compose_6',
        'Scope_2',
        'Compose_7',
        'Compose_8',
        'Compose_9',
      ]);
    });
  });

  describe('getUpstreamNodeIds', () => {
    it('should get all nodes in simple predecessor chain for a node in root graph', () => {
      const result = getUpstreamNodeIds('Response', graph, nodesMetadata, operationMap);
      expect(result).toEqual(['Execute_a_navigation_plan', 'manual']);
    });

    it('should get all upstream nodes including predecessor chain for parent nodes for a node in nested graph', () => {
      const result = getUpstreamNodeIds('Compose_8', graph, nodesMetadata, operationMap);
      expect(result).toEqual(['Compose_7', 'Compose_5', 'Compose_3', 'Response', 'Execute_a_navigation_plan', 'manual']);
    });

    it('should include all nodes inside nested graph when predecessor chain contains nested graphs for node in root graph', () => {
      const result = getUpstreamNodeIds('Compose_11', graph, nodesMetadata, operationMap);
      expect(result).toEqual([
        'Scope',
        'Compose_10',
        'Compose_3',
        'Compose_4',
        'Compose_5',
        'Compose_6',
        'Scope_2',
        'Compose_7',
        'Compose_8',
        'Compose_9',
        'Response',
        'Execute_a_navigation_plan',
        'manual',
      ]);
    });
  });
});
