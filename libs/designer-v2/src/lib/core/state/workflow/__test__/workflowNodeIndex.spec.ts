import { describe, it, expect } from 'vitest';
import type { WorkflowNode } from '../../../parsers/models/workflowNode';
import type { WorkflowState } from '../workflowInterfaces';
import { getWorkflowNodeFromGraphState, getWorkflowGraphPath, buildNodeIndex } from '../workflowGraphTraversal';

/**
 * Builds a synthetic tree graph with the given breadth and depth.
 * Node IDs follow the pattern "node-{level}-{index}".
 */
const buildGraph = (breadth: number, depth: number): WorkflowNode => {
  const build = (level: number, prefix: string): WorkflowNode[] => {
    if (level >= depth) {
      return [];
    }
    return Array.from({ length: breadth }, (_, index) => {
      const id = `${prefix}-${index}`;
      return {
        id,
        type: 'OPERATION_NODE' as const,
        children: build(level + 1, id),
      };
    });
  };

  return {
    id: 'root',
    type: 'GRAPH_NODE' as const,
    children: build(0, 'node'),
  };
};

/**
 * Wraps a graph in a minimal WorkflowState for getWorkflowNodeFromGraphState.
 */
const wrapState = (graph: WorkflowNode): WorkflowState => ({ graph }) as unknown as WorkflowState;

describe('getWorkflowNodeFromGraphState', () => {
  it('should find the root node', () => {
    const graph = buildGraph(3, 2);
    const result = getWorkflowNodeFromGraphState(wrapState(graph), 'root');
    expect(result).toBeDefined();
    expect(result?.id).toBe('root');
  });

  it('should find a deeply nested node', () => {
    const graph = buildGraph(2, 4);
    const result = getWorkflowNodeFromGraphState(wrapState(graph), 'node-0-0-0');
    expect(result).toBeDefined();
    expect(result?.id).toBe('node-0-0-0');
  });

  it('should return undefined for a non-existent node', () => {
    const graph = buildGraph(2, 3);
    const result = getWorkflowNodeFromGraphState(wrapState(graph), 'does-not-exist');
    expect(result).toBeUndefined();
  });

  it('should short-circuit and not visit all nodes after finding match', () => {
    const children: WorkflowNode[] = Array.from({ length: 100 }, (_, index) => ({
      id: `child-${index}`,
      type: 'OPERATION_NODE' as const,
    }));
    const graph: WorkflowNode = { id: 'root', type: 'GRAPH_NODE' as const, children };

    expect(getWorkflowNodeFromGraphState(wrapState(graph), 'child-0')?.id).toBe('child-0');
    expect(getWorkflowNodeFromGraphState(wrapState(graph), 'child-99')?.id).toBe('child-99');
  });
});

describe('getWorkflowGraphPath', () => {
  it('should return path to the root node', () => {
    const graph = buildGraph(2, 3);
    const path = getWorkflowGraphPath(graph, 'root');
    expect(path).toEqual(['root']);
  });

  it('should return complete ancestor path for a nested node', () => {
    const graph = buildGraph(2, 3);
    const path = getWorkflowGraphPath(graph, 'node-0-1');
    expect(path).toEqual(['root', 'node-0', 'node-0-1']);
  });

  it('should return [graphId] for a non-existent node', () => {
    const graph = buildGraph(2, 2);
    const path = getWorkflowGraphPath(graph, 'does-not-exist');
    expect(path).toEqual(['does-not-exist']);
  });

  it('should short-circuit after finding the target path', () => {
    const graph = buildGraph(3, 3);
    const path = getWorkflowGraphPath(graph, 'node-0-0');
    expect(path).toEqual(['root', 'node-0', 'node-0-0']);
  });
});

describe('buildNodeIndex', () => {
  it('should index all nodes in the graph', () => {
    const graph = buildGraph(10, 3);

    const allIds: string[] = [];
    const collectIds = (node: WorkflowNode) => {
      allIds.push(node.id);
      for (const child of node.children ?? []) {
        collectIds(child);
      }
    };
    collectIds(graph);

    const index = buildNodeIndex(graph);

    expect(index.size).toBe(allIds.length);
    for (const id of allIds) {
      expect(index.get(id)?.id).toBe(id);
    }
  });
});
