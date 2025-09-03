import Elk, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge, XYPosition } from '@xyflow/react';
import { isFunctionNode, panelWidth } from '../../utils/ReactFlow.Util';
import type { AppDispatch } from '../../core/state/Store';
import { setNeedsLayout, updateFunctionNodesPosition } from '../../core/state/DataMapSlice';

// the layout direction (T = top, R = right, B = bottom, L = left, TB = top to bottom, ...)
export type Direction = 'DOWN' | 'RIGHT' | 'LEFT' | 'UP';

export type LayoutOptions = {
  direction: Direction;
  spacing: [number, number];
};

export type LayoutAlgorithm = (nodes: Node[], edges: Edge[], options: LayoutOptions) => Promise<{ nodes: Node[] }>;

const elk = new Elk();

const elkLayout: LayoutAlgorithm = async (nodes, _edges, options) => {
  const graph = {
    id: 'elk-root',
    layoutOptions: {
      'elk.algorithm': 'sporeOverlap',
      'elk.direction': options.direction,
      'elk.spacing.nodeNode': `${options.spacing[0]}`,
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.measured?.width ?? 0,
      height: node.measured?.height ?? 0,
    })),
  };

  // We create a map of the laid out nodes here to avoid multiple traversals when
  // looking up a node's position later on.
  const root = await elk.layout(graph);
  const layoutNodes = new Map<string, ElkNode>();
  for (const node of root.children ?? []) {
    layoutNodes.set(node.id, node);
  }

  const nextNodes = nodes.map((node) => {
    const elkNode = layoutNodes.get(node.id)!;
    const position = { x: elkNode.x!, y: elkNode.y! };

    return {
      ...node,
      position,
    };
  });

  return { nodes: nextNodes };
};

export const autoLayout = (dispatch: AppDispatch, getIntersectingNodes: (node: Node) => Node[], nodes: Node[], edges: Edge[]) => {
  const functionNodes = nodes.filter((node) => isFunctionNode(node.id));

  if (functionNodes.length === 0) {
    return;
  }

  let intersectingNodeCount = 0;
  for (const node of functionNodes) {
    const intersectingNodes = getIntersectingNodes(node);
    intersectingNodeCount += intersectingNodes.length;
    if (intersectingNodeCount > 1) {
      break;
    }
  }

  if (functionNodes.length > 0 && intersectingNodeCount === 0) {
    return;
  }

  // The callback passed to `useEffect` cannot be `async` itself, so instead we
  // create an async function here and call it immediately afterwards.
  const runLayout = async (nodes: Node[], edges: Edge[]) => {
    dispatch(setNeedsLayout(false));
    const { nodes: nextNodes } = await elkLayout(nodes, edges, {
      spacing: [80, 50],
      direction: 'LEFT',
    });

    dispatch(
      updateFunctionNodesPosition(
        nextNodes
          .filter((node) => isFunctionNode(node.id))
          .reduce((acc: Record<string, XYPosition>, node) => {
            const { x: currentX, y: currentY } = node.position;
            acc[node.id] = {
              // Todo: This is a temporary fix for the layout issue. We need to find a better solution.
              x: currentX < panelWidth ? currentX + panelWidth : currentX,
              y: currentY,
            };
            return acc;
          }, {})
      )
    );
  };

  runLayout(nodes, edges);
};
