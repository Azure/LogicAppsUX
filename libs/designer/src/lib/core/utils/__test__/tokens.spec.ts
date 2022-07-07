import { WORKFLOW_NODE_TYPES } from '../../parsers/models/workflowNode';
import { createWorkflowEdge, createWorkflowNode } from '../graph';
import { getTokenNodeIds } from '../tokens';

describe('Token Picker Utilities', () => {
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
        id: 'Until',
        width: 200,
        height: 40,
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [
          createWorkflowNode('Until-#scope', WORKFLOW_NODE_TYPES.SCOPE_NODE),
          createWorkflowNode('Compose_10'),
          createWorkflowNode('Compose_3'),
          createWorkflowNode('Compose_4'),
          createWorkflowNode('Compose_5'),
          createWorkflowNode('Compose_6'),
          {
            id: 'Until_2',
            width: 200,
            height: 40,
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            children: [
              createWorkflowNode('Until_2-#scope', WORKFLOW_NODE_TYPES.SCOPE_NODE),
              createWorkflowNode('Compose_7'),
              createWorkflowNode('Compose_8'),
              createWorkflowNode('Compose_9'),
            ],
            edges: [
              createWorkflowEdge('Compose_7', 'Compose_8'),
              createWorkflowEdge('Compose_7', 'Compose_9'),
              createWorkflowEdge('Until_2-#scope', 'Compose_7'),
            ],
          },
        ],
        edges: [
          createWorkflowEdge('Until_2', 'Compose_10'),
          createWorkflowEdge('Compose_3', 'Compose_4'),
          createWorkflowEdge('Compose_3', 'Compose_5'),
          createWorkflowEdge('Compose_4', 'Compose_6'),
          createWorkflowEdge('Compose_5', 'Until_2'),
          createWorkflowEdge('Until-#scope', 'Compose_10'),
        ],
      },
    ],
    edges: [
      createWorkflowEdge('manual', 'Compose'),
      createWorkflowEdge('manual', 'Execute_a_navigation_plan'),
      createWorkflowEdge('Until', 'Compose_11'),
      createWorkflowEdge('Compose', 'Compose_2'),
      createWorkflowEdge('Execute_a_navigation_plan', 'Response'),
      createWorkflowEdge('Response', 'Until'),
    ],
  };

  const nodesMetadata = {
    manual: { graphId: 'root' },
    Compose: { graphId: 'root' },
    Compose_11: { graphId: 'root' },
    Compose_2: { graphId: 'root' },
    Execute_a_navigation_plan: { graphId: 'root' },
    Response: { graphId: 'root' },
    Until: { graphId: 'root' },
    Compose_10: { graphId: 'Until', parentNodeId: 'Until' },
    Compose_3: { graphId: 'Until', parentNodeId: 'Until' },
    Compose_4: { graphId: 'Until', parentNodeId: 'Until' },
    Compose_5: { graphId: 'Until', parentNodeId: 'Until' },
    Compose_6: { graphId: 'Until', parentNodeId: 'Until' },
    Until_2: { graphId: 'Until', parentNodeId: 'Until' },
    Compose_7: { graphId: 'Until_2', parentNodeId: 'Until_2' },
    Compose_8: { graphId: 'Until_2', parentNodeId: 'Until_2' },
    Compose_9: { graphId: 'Until_2', parentNodeId: 'Until_2' },
  };

  const operationMap = {
    manual: 'manual',
    Compose: 'Compose',
    Compose_11: 'Compose_11',
    Compose_2: 'Compose_2',
    Execute_a_navigation_plan: 'Execute_a_navigation_plan',
    Response: 'Response',
    Until: 'Until',
    Compose_10: 'Compose_10',
    Compose_3: 'Compose_3',
    Compose_4: 'Compose_4',
    Compose_5: 'Compose_5',
    Compose_6: 'Compose_6',
    Until_2: 'Until_2',
    Compose_7: 'Compose_7',
    Compose_8: 'Compose_8',
    Compose_9: 'Compose_9',
  };

  const nodesManifest = {
    Until: { manifest: { properties: { outputTokens: { selfReference: true } } } },
    Until_2: { manifest: { properties: { outputTokens: { selfReference: true } } } },
    manual: { manifest: { properties: {} } },
    Compose: { manifest: { properties: {} } },
    Compose_11: { manifest: { properties: {} } },
    Compose_2: { manifest: { properties: {} } },
    Execute_a_navigation_plan: { manifest: { properties: {} } },
    Response: { manifest: { properties: {} } },
    Compose_10: { manifest: { properties: {} } },
    Compose_3: { manifest: { properties: {} } },
    Compose_4: { manifest: { properties: {} } },
    Compose_5: { manifest: { properties: {} } },
    Compose_6: { manifest: { properties: {} } },
    Compose_7: { manifest: { properties: {} } },
    Compose_8: { manifest: { properties: {} } },
    Compose_9: { manifest: { properties: {} } },
  } as any;

  describe('getTokenNodeIds', () => {
    it('should get all nodes in upstream chain for a node in root graph', () => {
      let result = getTokenNodeIds('Response', graph, nodesMetadata, nodesManifest, operationMap);
      expect(result).toEqual(['Execute_a_navigation_plan', 'manual']);

      result = getTokenNodeIds('Compose_8', graph, nodesMetadata, nodesManifest, operationMap);
      expect(result).toEqual(['Compose_7', 'Compose_5', 'Compose_3', 'Response', 'Execute_a_navigation_plan', 'manual']);
    });

    it('should get all containing nodes for until operation along with its upstream nodes in graph', () => {
      let result = getTokenNodeIds('Until_2', graph, nodesMetadata, nodesManifest, operationMap);
      expect(result).toEqual([
        'Compose_5',
        'Compose_3',
        'Response',
        'Execute_a_navigation_plan',
        'manual',
        'Compose_7',
        'Compose_8',
        'Compose_9',
      ]);

      result = getTokenNodeIds('Until', graph, nodesMetadata, nodesManifest, operationMap);
      expect(result).toEqual([
        'Response',
        'Execute_a_navigation_plan',
        'manual',
        'Compose_10',
        'Compose_3',
        'Compose_4',
        'Compose_5',
        'Compose_6',
        'Until_2',
        'Compose_7',
        'Compose_8',
        'Compose_9',
      ]);
    });
  });
});
