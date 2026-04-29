import { describe, test, expect } from 'vitest';
import { collapseFlowTree, isA2AWorkflow } from '../helper'; // Adjust the import path as needed
import { WorkflowNode } from '../../../parsers/models/workflowNode';
import type { WorkflowState } from '../workflowInterfaces';

describe('collapseFlowTree', () => {
  test('should return the original tree when no collapsed nodes are provided', () => {
    const tree: WorkflowNode = {
      id: 'root',
      type: 'GRAPH_NODE',
      children: [
        { id: 'child1', type: 'OPERATION_NODE' },
        { id: 'child2', type: 'OPERATION_NODE' },
      ],
      edges: [],
    };

    const collapsedIds = {}; // no collapsed nodes
    const { graph, collapsedMapping } = collapseFlowTree(tree, collapsedIds);

    // With no collapsed nodes, the graph should equal the original tree.
    expect(graph).toEqual(tree);
    expect(collapsedMapping).toEqual({});
  });

  test('should collapse a node and remove its downstream nodes', () => {
    const tree: WorkflowNode = {
      id: 'root',
      type: 'GRAPH_NODE',
      children: [
        {
          id: 'A',
          type: 'OPERATION_NODE',
          edges: [{ id: 'edge-A-B', source: 'A', target: 'B', type: 'BUTTON_EDGE' }],
          children: [{ id: 'B', type: 'OPERATION_NODE' }],
        },
        { id: 'C', type: 'OPERATION_NODE' },
      ],
      edges: [{ id: 'edge-root-A', source: 'root', target: 'A', type: 'BUTTON_EDGE' }],
    };

    const collapsedIds = { A: true };
    const { graph, collapsedMapping } = collapseFlowTree(tree, collapsedIds);

    // In the graph, node A should have been collapsed.
    const nodeA = (graph?.children ?? []).find((child) => child.id === 'A');
    expect(nodeA).toBeDefined();
    expect(nodeA?.type).toBe('COLLAPSED_NODE');
    expect(nodeA?.children).toBeUndefined();
    expect(nodeA?.edges).toBeUndefined();

    // Node B (which is downstream of A) should be removed.
    // The collapsedMapping for node A should include "B".
    expect(collapsedMapping.A).toEqual(expect.arrayContaining(['B']));
  });

  test('should collapse multiple nodes and correctly map their downstream nodes', () => {
    const tree: WorkflowNode = {
      id: 'root',
      type: 'GRAPH_NODE',
      children: [
        {
          id: 'A',
          type: 'OPERATION_NODE',
          edges: [{ id: 'edge-A-B', source: 'A', target: 'B', type: 'BUTTON_EDGE' }],
          children: [{ id: 'B', type: 'OPERATION_NODE' }],
        },
        {
          id: 'C',
          type: 'OPERATION_NODE',
          edges: [{ id: 'edge-C-D', source: 'C', target: 'D', type: 'BUTTON_EDGE' }],
          children: [{ id: 'D', type: 'OPERATION_NODE' }],
        },
      ],
      edges: [
        { id: 'edge-root-A', source: 'root', target: 'A', type: 'BUTTON_EDGE' },
        { id: 'edge-root-C', source: 'root', target: 'C', type: 'BUTTON_EDGE' },
      ],
    };

    const collapsedIds = { A: true, C: true };
    const { graph, collapsedMapping } = collapseFlowTree(tree, collapsedIds);

    // Both nodes A and C should be collapsed.
    (graph?.children ?? []).forEach((child) => {
      if (collapsedIds[child.id]) {
        expect(child.type).toBe('COLLAPSED_NODE');
        expect(child.children).toBeUndefined();
        expect(child.edges).toBeUndefined();
      }
    });

    // Check that collapsedMapping correctly records the downstream nodes.
    expect(collapsedMapping.A).toEqual(expect.arrayContaining(['B']));
    expect(collapsedMapping.C).toEqual(expect.arrayContaining(['D']));
  });

  test('should filter out edges referencing removed nodes', () => {
    const tree: WorkflowNode = {
      id: 'root',
      type: 'GRAPH_NODE',
      children: [
        {
          id: 'A',
          type: 'OPERATION_NODE',
          edges: [
            { id: 'edge-A-B', source: 'A', target: 'B', type: 'BUTTON_EDGE' },
            { id: 'edge-A-C', source: 'A', target: 'C', type: 'BUTTON_EDGE' },
          ],
          children: [
            { id: 'B', type: 'OPERATION_NODE' },
            { id: 'C', type: 'OPERATION_NODE' },
          ],
        },
      ],
      edges: [],
    };

    const collapsedIds = { A: true };
    const { graph } = collapseFlowTree(tree, collapsedIds);

    // After collapsing A, it should have no edges.
    const nodeA = (graph?.children ?? []).find((child) => child.id === 'A');
    expect(nodeA).toBeDefined();
    expect(nodeA?.edges).toBeUndefined();
  });
});

describe('isA2AWorkflow', () => {
  // Helper to create minimal workflow state
  const createWorkflowState = (overrides: Partial<WorkflowState> = {}): WorkflowState => ({
    graph: {
      id: 'root',
      type: 'GRAPH_NODE',
      children: [],
      edges: [],
    },
    operations: {},
    nodesMetadata: {},
    collapsedGraphIds: {},
    edgeIdsBySource: {},
    idReplacements: {},
    newlyAddedOperations: {},
    isDirty: false,
    focusedTab: undefined,
    ...overrides,
  });

  describe('Standard SKU detection', () => {
    test('should return true for Standard SKU with workflowKind="agent"', () => {
      const state = createWorkflowState({
        workflowKind: 'agent',
      });

      expect(isA2AWorkflow(state)).toBe(true);
    });

    test('should return false for Standard SKU with workflowKind="stateful"', () => {
      const state = createWorkflowState({
        workflowKind: 'stateful',
      });

      expect(isA2AWorkflow(state)).toBe(false);
    });

    test('should return false for Standard SKU with workflowKind="stateless"', () => {
      const state = createWorkflowState({
        workflowKind: 'stateless',
      });

      expect(isA2AWorkflow(state)).toBe(false);
    });
  });

  describe('Consumption SKU - metadata detection', () => {
    test('should return true for Consumption SKU with agentType="conversational"', () => {
      const state = createWorkflowState({
        originalDefinition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          metadata: {
            agentType: 'conversational',
          },
          triggers: {},
          actions: {},
        },
      });

      expect(isA2AWorkflow(state)).toBe(true);
    });

    test('should return false for Consumption SKU with agentType="Conversational" (case sensitive)', () => {
      // The equals() function is case-sensitive for metadata check
      const state = createWorkflowState({
        originalDefinition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          metadata: {
            agentType: 'Conversational',
          },
          triggers: {},
          actions: {},
        },
      });

      expect(isA2AWorkflow(state)).toBe(false);
    });

    test('should return false for Consumption SKU with different agentType', () => {
      const state = createWorkflowState({
        originalDefinition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          metadata: {
            agentType: 'autonomous',
          },
          triggers: {},
          actions: {},
        },
      });

      expect(isA2AWorkflow(state)).toBe(false);
    });
  });

  describe('Consumption SKU - trigger pattern detection', () => {
    test('should return true for Consumption SKU with Request trigger and Agent kind', () => {
      const state = createWorkflowState({
        nodesMetadata: {
          trigger1: {
            graphId: 'root',
            isRoot: true,
            isTrigger: true,
          },
        },
        operations: {
          trigger1: {
            type: 'Request',
            kind: 'Agent',
            inputs: {},
          },
        },
      });

      expect(isA2AWorkflow(state)).toBe(true);
    });

    test('should return true for trigger pattern with case-insensitive matching', () => {
      const state = createWorkflowState({
        nodesMetadata: {
          trigger1: {
            graphId: 'root',
            isRoot: true,
            isTrigger: true,
          },
        },
        operations: {
          trigger1: {
            type: 'request',
            kind: 'agent',
            inputs: {},
          },
        },
      });

      expect(isA2AWorkflow(state)).toBe(true);
    });

    test('should return false for Request trigger without Agent kind', () => {
      const state = createWorkflowState({
        nodesMetadata: {
          trigger1: {
            graphId: 'root',
            isRoot: true,
            isTrigger: true,
          },
        },
        operations: {
          trigger1: {
            type: 'Request',
            kind: 'Http',
            inputs: {},
          },
        },
      });

      expect(isA2AWorkflow(state)).toBe(false);
    });

    test('should return false for Agent kind without Request trigger', () => {
      const state = createWorkflowState({
        nodesMetadata: {
          trigger1: {
            graphId: 'root',
            isRoot: true,
            isTrigger: true,
          },
        },
        operations: {
          trigger1: {
            type: 'Recurrence',
            kind: 'Agent',
            inputs: {},
          },
        },
      });

      expect(isA2AWorkflow(state)).toBe(false);
    });
  });

  describe('Edge cases and fallback behavior', () => {
    test('should return false for regular workflow with no A2A indicators', () => {
      const state = createWorkflowState({
        operations: {
          trigger1: {
            type: 'Recurrence',
            kind: 'Http',
            inputs: {},
          },
        },
        nodesMetadata: {
          trigger1: {
            graphId: 'root',
            isRoot: true,
            isTrigger: true,
          },
        },
      });

      expect(isA2AWorkflow(state)).toBe(false);
    });

    test('should return false for empty workflow state', () => {
      const state = createWorkflowState();

      expect(isA2AWorkflow(state)).toBe(false);
    });

    test('should return false when no trigger exists', () => {
      const state = createWorkflowState({
        operations: {
          action1: {
            type: 'Http',
            inputs: {},
          },
        },
        nodesMetadata: {
          action1: {
            graphId: 'root',
            isRoot: false,
            isTrigger: false,
          },
        },
      });

      expect(isA2AWorkflow(state)).toBe(false);
    });

    test('should handle workflow with multiple non-trigger nodes', () => {
      const state = createWorkflowState({
        operations: {
          action1: { type: 'Http', inputs: {} },
          action2: { type: 'Response', inputs: {} },
          action3: { type: 'Compose', inputs: {} },
        },
        nodesMetadata: {
          action1: { graphId: 'root', isRoot: false, isTrigger: false },
          action2: { graphId: 'root', isRoot: false, isTrigger: false },
          action3: { graphId: 'root', isRoot: false, isTrigger: false },
        },
      });

      expect(isA2AWorkflow(state)).toBe(false);
    });
  });

  describe('Priority and short-circuit behavior', () => {
    test('should prioritize workflowKind="agent" over other checks', () => {
      // Even with conflicting metadata, workflowKind should win
      const state = createWorkflowState({
        workflowKind: 'agent',
        originalDefinition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          metadata: {
            agentType: 'someOtherType',
          },
          triggers: {},
          actions: {},
        },
      });

      expect(isA2AWorkflow(state)).toBe(true);
    });

    test('should short-circuit on explicit non-agent workflowKind', () => {
      // Should return false without checking other properties
      const state = createWorkflowState({
        workflowKind: 'stateful',
        originalDefinition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          metadata: {
            agentType: 'conversational',
          },
          triggers: {},
          actions: {},
        },
      });

      expect(isA2AWorkflow(state)).toBe(false);
    });

    test('should fall through to metadata check when workflowKind is undefined', () => {
      const state = createWorkflowState({
        workflowKind: undefined,
        originalDefinition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          metadata: {
            agentType: 'conversational',
          },
          triggers: {},
          actions: {},
        },
      });

      expect(isA2AWorkflow(state)).toBe(true);
    });
  });
});
