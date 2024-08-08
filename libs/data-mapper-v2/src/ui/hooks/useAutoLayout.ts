import Elk, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import { useEffect, useState } from 'react';
import { type Node, type Edge, type XYPosition, useStore, useReactFlow } from '@xyflow/react';
import { isFunctionNode } from '../../utils/ReactFlow.Util';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../core/state/Store';
import { updateFunctionNodesPosition } from '../../core/state/DataMapSlice';

// the layout direction (T = top, R = right, B = bottom, L = left, TB = top to bottom, ...)
export type Direction = 'DOWN' | 'RIGHT' | 'LEFT' | 'UP';

export type LayoutOptions = {
  direction: Direction;
  spacing: [number, number];
};

export type LayoutAlgorithm = (nodes: Node[], edges: Edge[], options: LayoutOptions) => Promise<{ nodes: Node[] }>;

const elk = new Elk();

const elkLayout: LayoutAlgorithm = async (nodes, edges, options) => {
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

type Elements = {
  nodeMap: Map<string, Node>;
  edgeMap: Map<string, Edge>;
};

function compareElements(xs: Elements, ys: Elements) {
  return compareNodes(xs.nodeMap, ys.nodeMap);
}

function compareNodes(xs: Map<string, Node>, ys: Map<string, Node>) {
  const xsFunctionNodes = [...xs.values()].filter((node) => isFunctionNode(node.id));
  const ysFunctionNodes = [...ys.values()].filter((node) => isFunctionNode(node.id));
  if (xsFunctionNodes.length !== ysFunctionNodes.length) {
    return false;
  }

  for (const x of xsFunctionNodes) {
    const y = ys.get(x.id);

    // the node doesn't exist in the next state so it just got added
    if (!y) {
      return false;
    }

    // We don't want to force a layout change while a user might be resizing a
    // node, so we only compare the dimensions if the node is not currently
    // being resized.
    //
    // We early return here instead of using a `continue` because there's no
    // scenario where we'd want nodes to start moving around *while* a user is
    // trying to resize a node or move it around.
    if (x.resizing || x.dragging) {
      return true;
    }
    if (x.measured?.width !== y.measured?.width || x.measured?.height !== y.measured?.height) {
      return false;
    }
  }

  return true;
}

const useAutoLayout = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isLayouted, setIsLayouted] = useState(false);
  const { getIntersectingNodes } = useReactFlow();
  // Here we are storing a map of the nodes and edges in the flow. By using a
  // custom equality function as the second argument to `useStore`, we can make
  // sure the layout algorithm only runs when something has changed that should
  // actually trigger a layout change.
  const elements = useStore(
    (state) => ({
      nodeMap: state.nodeLookup,
      edgeMap: state.edgeLookup,
    }),
    // The compare elements function will only update `elements` if something has
    // changed that should trigger a layout. This includes changes to a node's
    // dimensions, the number of nodes, or changes to edge sources/targets.
    compareElements
  );

  useEffect(() => {
    // Only run the layout if there are nodes and they have been initialized with
    // their dimensions
    // does not run on first node placed
    if (isLayouted) {
      return;
    }

    const nodes = [...elements.nodeMap.values()];
    const edges = [...elements.edgeMap.values()];
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
      setIsLayouted(true);
      return;
    }

    // The callback passed to `useEffect` cannot be `async` itself, so instead we
    // create an async function here and call it immediately afterwards.
    const runLayout = async (nodes: Node[], edges: Edge[]) => {
      const { nodes: nextNodes } = await elkLayout(nodes, edges, {
        spacing: [50, 50],
        direction: 'LEFT',
      });

      dispatch(
        updateFunctionNodesPosition(
          nextNodes
            .filter((node) => isFunctionNode(node.id))
            .reduce((acc: Record<string, XYPosition>, node) => {
              acc[node.id] = node.position;
              return acc;
            }, {})
        )
      );
      setIsLayouted(true);
    };

    runLayout(nodes, edges);
  }, [elements, dispatch, isLayouted, getIntersectingNodes]);
};

export default useAutoLayout;
