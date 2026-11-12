import { createWorkflowEdge, createWorkflowNode, isRootNode, getAllNodesInsideNode, getUpstreamNodeIds, isTriggerNode } from '../graph';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import * as graphUtils from '../graph';
import { getTestIntl } from '../../../__test__/intl-test-helper';
import { WORKFLOW_EDGE_TYPES } from '@microsoft/logic-apps-shared';
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
    manual: { graphId: 'root', isRoot: true, isTrigger: true },
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

  it('uses renderer-authoritative operation sizes without overriding other measured node kinds', () => {
    expect(graphUtils.getNodePresentation(undefined, true)).toEqual({ shared: true, size: { width: 232, height: 74 } });
    expect(graphUtils.getNodePresentation(WORKFLOW_NODE_TYPES.OPERATION_NODE, false)).toEqual({
      shared: false,
    });
    expect(graphUtils.getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true)).toEqual({ shared: false, size: undefined });
  });

  it('keeps graph and ELK factories aligned and excludes hidden edges from leaf detection', () => {
    expect(graphUtils.createElkNode('action')).toMatchObject({
      id: 'action',
      width: 200,
      height: 40,
      layoutOptions: { nodeType: WORKFLOW_NODE_TYPES.OPERATION_NODE },
    });
    expect(graphUtils.createElkEdge('one', 'two')).toMatchObject({
      sources: ['one'],
      targets: ['two'],
      layoutOptions: { edgeType: WORKFLOW_EDGE_TYPES.BUTTON_EDGE },
    });
    expect(graphUtils.isLeafNodeFromEdges([createWorkflowEdge('one', 'two', WORKFLOW_EDGE_TYPES.HIDDEN_EDGE)])).toBe(true);
    expect(graphUtils.isLeafNodeFromEdges([createWorkflowEdge('one', 'two')])).toBe(false);
  });

  it('finds the actual root trigger and tolerates a graph with no trigger', () => {
    const state = { graph, nodesMetadata } as Parameters<typeof graphUtils.getTriggerNode>[0];
    expect(graphUtils.getTriggerNode(state)?.id).toBe('manual');
    expect(graphUtils.getTriggerNodeId(state)).toBe('manual');
    expect(graphUtils.getTriggerNodeId({ ...state, graph: { ...graph, children: [] } })).toBeUndefined();
  });

  it('resolves metadata and does not invent a containing graph for an unknown node', () => {
    expect(graphUtils.getGraphNode('Compose_8', graph, nodesMetadata)?.id).toBe('Scope_2');
    expect(graphUtils.getGraphNode('missing', graph, nodesMetadata)).toBeUndefined();
    expect(graphUtils.getNode('absent', graph)).toBeUndefined();
    expect(graphUtils.getImmediateSourceNodeIds({ id: 'empty' }, 'node')).toEqual([]);
    expect(
      graphUtils.getImmediateSourceNodeIds(
        {
          id: 'nested',
          edges: [createWorkflowEdge('real', 'node'), createWorkflowEdge('fake#scope', 'node')],
        },
        'node'
      )
    ).toEqual(['real']);
  });

  it('avoids existing operation ID collisions when finding a new ID', () => {
    expect(
      graphUtils.getNewNodeId({ operations: { action: {}, action_1: {} } } as Parameters<typeof graphUtils.getNewNodeId>[0], 'action')
    ).toBe('action_2');
  });

  it('includes graph parents and handoff parents without dropping ordinary ancestry', () => {
    const metadata = { ...nodesMetadata, Handoff: { graphId: 'root', handoffs: { tool: 'Compose_8' } } };
    expect(graphUtils.getAllParentsForNode('Compose_8', metadata)).toEqual(['Scope_2', 'Scope', 'Handoff']);
    expect(graphUtils.getAllParentsForNode('Compose_8', metadata, true)).toEqual(['Scope_2', 'Scope', 'root', 'Handoff']);
  });

  it.each(['', 'internal.reserved', '@{variables("x")}', 'x'.repeat(81), 'bad:name', 'bad/name'])(
    'rejects invalid operation title %s before rename',
    (name) => {
      expect(graphUtils.isOperationNameValid('new', name, false, nodesMetadata, {}, getTestIntl()).isValid).toBe(false);
    }
  );

  it('rejects renamed collisions but permits valid trigger names and title normalization', () => {
    expect(
      graphUtils.isOperationNameValid('new', 'updated name', false, nodesMetadata, { Compose: 'Updated_Name' }, getTestIntl()).isValid
    ).toBe(false);
    expect(graphUtils.isOperationNameValid('new', 'internal.trigger', true, nodesMetadata, {}, getTestIntl())).toEqual({
      isValid: true,
      message: '',
    });
    expect(graphUtils.transformOperationTitle('A new name')).toBe('A_new_name');
  });

  it.each(['1tool', 'bad-tool', 'a'.repeat(49)])('rejects invalid agent tool identifier %s', (name) => {
    const metadata = { tool: { graphId: 'root', subgraphType: 'AGENT_CONDITION' } };
    expect(graphUtils.isOperationNameValid('tool', name, false, metadata, {}, getTestIntl()).isValid).toBe(false);
    expect(graphUtils.isOperationNameValid('tool', 'valid_tool', false, metadata, {}, getTestIntl()).isValid).toBe(true);
  });

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

  describe('isTriggerNodeInGraph', () => {
    it('should return true for a trigger node in root graph', () => {
      expect(isTriggerNode('manual', nodesMetadata)).toBeTruthy();
    });

    it('should return false for any action node in root graph or any root node in nested graph', () => {
      expect(isTriggerNode('Compose_2', nodesMetadata)).toBeFalsy();
      expect(isTriggerNode('Compose_10', nodesMetadata)).toBeFalsy();
      expect(isTriggerNode('Compose_3', nodesMetadata)).toBeFalsy();
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
      expect(result).toEqual([
        'Compose_7',
        'Compose_5',
        'Compose_3',
        'Scope_2',
        'Response',
        'Execute_a_navigation_plan',
        'manual',
        'Scope',
      ]);
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
