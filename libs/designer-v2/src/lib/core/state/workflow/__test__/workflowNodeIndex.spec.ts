import { describe, it, expect } from 'vitest';
import type { WorkflowNode } from '../../../parsers/models/workflowNode';

/**
 * Inline the traversal logic (same as getWorkflowNodeFromGraphState) so we
 * avoid importing workflowSelectors — that module pulls in designer-ui which
 * requires a full DOM (navigator.userAgent) at import time.
 */
const traverseGraphForNode = (root: WorkflowNode, actionId: string): WorkflowNode | undefined => {
  if (root.id === actionId) {
    return root;
  }
  for (const child of root.children ?? []) {
    const result = traverseGraphForNode(child, actionId);
    if (result) {
      return result;
    }
  }
  return undefined;
};

const traverseGraphForPath = (root: WorkflowNode, graphId: string): string[] => {
  const walk = (node: WorkflowNode, path: string[] = []): string[] | undefined => {
    if (node.id === graphId) {
      return path;
    }
    for (const child of node.children ?? []) {
      const result = walk(child, [...path, node.id]);
      if (result) {
        return result;
      }
    }
    return undefined;
  };
  return [...(walk(root) ?? []), graphId];
};

const buildIndex = (graph: WorkflowNode): Map<string, WorkflowNode> => {
  const index = new Map<string, WorkflowNode>();
  const queue: WorkflowNode[] = [graph];
  while (queue.length > 0) {
    const node = queue.shift()!;
    index.set(node.id, node);
    for (const child of node.children ?? []) {
      queue.push(child);
    }
  }
  return index;
};

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

describe('traverseGraphForNode', () => {
  it('should find the root node', () => {
    const graph = buildGraph(3, 2);
    const result = traverseGraphForNode(graph, 'root');
    expect(result).toBeDefined();
    expect(result?.id).toBe('root');
  });

  it('should find a deeply nested node', () => {
    const graph = buildGraph(2, 4);
    const result = traverseGraphForNode(graph, 'node-0-0-0');
    expect(result).toBeDefined();
    expect(result?.id).toBe('node-0-0-0');
  });

  it('should return undefined for a non-existent node', () => {
    const graph = buildGraph(2, 3);
    const result = traverseGraphForNode(graph, 'does-not-exist');
    expect(result).toBeUndefined();
  });

  it('should short-circuit and not visit all nodes after finding match', () => {
    const children: WorkflowNode[] = Array.from({ length: 100 }, (_, index) => ({
      id: `child-${index}`,
      type: 'OPERATION_NODE' as const,
    }));
    const graph: WorkflowNode = { id: 'root', type: 'GRAPH_NODE' as const, children };

    expect(traverseGraphForNode(graph, 'child-0')?.id).toBe('child-0');
    expect(traverseGraphForNode(graph, 'child-99')?.id).toBe('child-99');
  });
});

describe('traverseGraphForPath', () => {
  it('should return path to the root node', () => {
    const graph = buildGraph(2, 3);
    const path = traverseGraphForPath(graph, 'root');
    expect(path).toEqual(['root']);
  });

  it('should return complete ancestor path for a nested node', () => {
    const graph = buildGraph(2, 3);
    const path = traverseGraphForPath(graph, 'node-0-1');
    expect(path).toEqual(['root', 'node-0', 'node-0-1']);
  });

  it('should return [graphId] for a non-existent node', () => {
    const graph = buildGraph(2, 2);
    const path = traverseGraphForPath(graph, 'does-not-exist');
    expect(path).toEqual(['does-not-exist']);
  });

  it('should short-circuit after finding the target path', () => {
    const graph = buildGraph(3, 3);
    const path = traverseGraphForPath(graph, 'node-0-0');
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

    const index = buildIndex(graph);

    expect(index.size).toBe(allIds.length);
    for (const id of allIds) {
      expect(index.get(id)?.id).toBe(id);
    }
  });
});
