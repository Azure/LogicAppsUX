import type { WorkflowGraph, WorkflowNode } from '../parsers/models/workflowNode';
import { isWorkflowNode } from '../parsers/models/workflowNode';
import type { RootState } from '../store';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled';
import ELK from 'elkjs/lib/elk.bundled';
import { useEffect, useState } from 'react';
import type { Edge, Node } from 'react-flow-renderer';
import { useSelector } from 'react-redux';

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

const elkLayout = async (workflowGraph: ElkNode) => {
  const graph = new ELK();

  const layout = await graph.layout(JSON.parse(JSON.stringify(workflowGraph)), {
    layoutOptions: defaultLayoutOptions,
  });
  return layout;
};

const convertElkGraphToReactFlow = (graph: ElkNode): [Node<NodeData>[], Edge[]] => {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];

  const processChildren = (node: ElkNode, parent?: string) => {
    for (const edge of node.edges as ElkExtendedEdge[]) {
      edges.push({
        id: edge.id,
        target: edge.targets[0],
        source: edge.sources[0],
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
        type: node.children ? 'graphNode' : 'testNode',
        style: node.children ? { height: node.height, width: node.width } : undefined,
      });
    }

    for (const n of node.children as ElkNode[]) {
      nodes.push({
        id: n.id,
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        data: { label: n.id }, // Danielle
        parentNode: node.id !== 'root' ? node.id : undefined,
        type: n.children ? 'graphNode' : 'testNode',
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

const convertWorkflowGraphToElkGraph = (node: WorkflowGraph | WorkflowNode): ElkNode => {
  if (isWorkflowNode(node)) {
    return {
      ...node,
      children: node.children && node.children.map(convertWorkflowGraphToElkGraph),
    };
  }
  return {
    ...node,
    children: node.children && node.children.map(convertWorkflowGraphToElkGraph),
    edges:
      node.edges &&
      node.edges.map((edge) => ({
        ...edge,
        targets: [edge.target],
        sources: [edge.source],
        target: undefined,
        source: undefined,
      })),
  };
};

interface NodeData {
  label: string;
}

export const useLayout = (): [Node[], Edge[]] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<Node<NodeData>[]>([]); // Danielle can we add the type here?
  const [reactFlowEdges, setReactFlowEdges] = useState<Edge[]>([]);
  const workflowGraph = useSelector((state: RootState) => state.workflow.graph);

  useEffect(() => {
    if (!workflowGraph) {
      return;
    }

    const elkGraph: ElkNode = convertWorkflowGraphToElkGraph(workflowGraph);
    elkLayout(elkGraph)
      .then((g) => {
        const [n, e] = convertElkGraphToReactFlow(g);
        setReactFlowNodes(n);
        setReactFlowEdges(e);
      })
      .catch((err) => {
        console.error(err);
        //TODO: Appropriately log this when we have analytics
      });
  }, [workflowGraph]);

  return [reactFlowNodes, reactFlowEdges];
};

export const exportForTesting = {
  convertElkGraphToReactFlow,
  convertWorkflowGraphToElkGraph,
  elkLayout,
};
