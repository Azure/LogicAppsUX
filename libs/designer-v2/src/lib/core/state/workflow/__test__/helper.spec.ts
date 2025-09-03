import { describe, test, expect } from 'vitest';
import { collapseFlowTree } from '../helper'; // Adjust the import path as needed
import { WorkflowNode } from '../../../parsers/models/workflowNode';

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
