import ELK, { ElkNode, ElkPrimitiveEdge } from 'elkjs/lib/main';
import { Edge, Node } from 'react-flow-renderer';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const defaultLayoutOptions: Record<string, string> = {
  'elk.algorithm': 'org.eclipse.elk.layered',
  'elk.direction': 'DOWN',
  'org.eclipse.elk.alignment': 'TOP',
  'org.eclipse.elk.layered.layering.strategy': 'INTERACTIVE',
  'org.eclipse.elk.edge.type': 'DIRECTED',
  'org.eclipse.elk.edgeRouting': 'POLYLINE',
  'elk.layered.unnecessaryBendpoints': 'false',
  'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.layered.spacing.edgeNodeBetweenLayers': '50',
  'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  'spacing.nodeNodeBetweenLayers': '70',
};

export const elkLayout = async (workflowGraph: ElkNode) => {
  const graph = new ELK();

  const layout = await graph.layout(JSON.parse(JSON.stringify(workflowGraph)), {
    layoutOptions: defaultLayoutOptions,
  });
  return layout;
};

const convertElkGraphToReactFlow = (graph: ElkNode): [Node[], Edge[]] => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const processChildren = (node: ElkNode, parent?: string) => {
    for (const edge of node.edges as ElkPrimitiveEdge[]) {
      edges.push({
        id: edge.id,
        target: edge.target,
        source: edge.source,
        type: 'buttonedge',
        data: {
          elkEdge: edge,
        },
      });
    }

    if (parent && parent !== 'root') {
      nodes.push({
        id: node.id,
        position: { x: node.x ?? 0, y: node.y ?? 0 },
        data: { label: node.id },
        parentNode: parent,
        type: node.children ? undefined : 'testNode',
        style: node.children ? { height: node.height, width: node.width } : undefined,
      });
    }

    for (const n of node.children as ElkNode[]) {
      nodes.push({
        id: n.id,
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        data: { label: n.id },
        parentNode: node.id !== 'root' ? node.id : undefined,
        type: n.children ? undefined : 'testNode',
        style: n.children ? { height: n.height, width: n.width } : undefined,
      });

      if (n.children) {
        n.children.forEach((x) => processChildren(x, n.id));
      }
    }
  };
  processChildren(graph);
  return [nodes, edges];
};

export const useLayout = (): [Node[], Edge[]] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<Edge[]>([]);
  const workflowGraph = useSelector((state: RootState) => state.workflow.graph);

  useEffect(() => {
    if (!workflowGraph) {
      return;
    }

    const elkGraph: ElkNode = workflowGraph;
    elkLayout(elkGraph)
      .then((g) => {
        const [n, e] = convertElkGraphToReactFlow(g);
        setReactFlowNodes(n);
        setReactFlowEdges(e);
      })
      .catch(() => {
        console.log('ELK through an error');
        //TODO: Appropriately log this when we have analytics
      });
  }, [workflowGraph]);

  return [reactFlowNodes, reactFlowEdges];
};
