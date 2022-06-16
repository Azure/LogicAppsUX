import type { WorkflowGraph, WorkflowNode } from '../parsers/models/workflowNode';
import { isWorkflowGraph } from '../parsers/models/workflowNode';
import type { RootState } from '../store';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled';
import ELK from 'elkjs/lib/elk.bundled';
import { useEffect, useState } from 'react';
import type { Edge, Node } from 'react-flow-renderer';
import { useSelector } from 'react-redux';

const defaultLayoutOptions: Record<string, string> = {
  'elk.algorithm': 'org.eclipse.elk.layered',
  'elk.direction': 'DOWN',
  'elk.alignment': 'TOP',
  'elk.layered.layering.strategy': 'INTERACTIVE',
  'elk.edge.type': 'DIRECTED',
  'elk.layered.unnecessaryBendpoints': 'false',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  'elk.layered.spacing.edgeNodeBetweenLayers': '40',
  'elk.layered.spacing.nodeNodeBetweenLayers': '60',
  'elk.padding': '[top=0,left=16,bottom=16,right=16]',
  // This option allows the first layer children of a graph to be laid out in order of appearance in manifest. This is useful for subgraph ordering, like in Switch nodes.
  'elk.layered.crossingMinimization.semiInteractive': 'true',
};

const defaultEdgeType = 'buttonEdge';
const defaultNodeType = 'testNode';

const elkLayout = async (workflowGraph: ElkNode) => {
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
    for (const edge of node.edges as ElkExtendedEdge[]) {
      edges.push({
        id: edge.id,
        target: edge.targets[0],
        source: edge.sources[0],
        type: edge.layoutOptions?.['edgeType'] ?? defaultEdgeType,
        data: {
          elkEdge: edge,
        },
      });
    }

    if (parent && parent !== 'root') {
      const typeFromLayout = node.layoutOptions?.['nodeType'] ?? defaultNodeType;
      nodes.push({
        id: node.id,
        position: { x: node.x ?? 0, y: node.y ?? 0 },
        data: { label: node.id },
        parentNode: parent,
        type: typeFromLayout,
        style: node.children ? { height: node.height, width: node.width } : undefined,
      });
    }

    for (const n of node.children as ElkNode[]) {
      nodes.push({
        id: n.id,
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        data: { label: n.id },
        parentNode: node.id !== 'root' ? node.id : undefined,
        type: n.layoutOptions?.['nodeType'] ?? defaultNodeType,
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
  if (!isWorkflowGraph(node)) {
    return {
      ...node,
      children: node.children?.map(convertWorkflowGraphToElkGraph),
      layoutOptions: {
        nodeType: node?.type ?? defaultNodeType,
      },
    };
  } else {
    return {
      ...node,
      children: node.children?.map(convertWorkflowGraphToElkGraph),
      edges: node.edges?.map((edge) => ({
        ...edge,
        targets: [edge.target],
        sources: [edge.source],
        target: undefined,
        source: undefined,
        layoutOptions: {
          edgeType: edge?.type ?? defaultEdgeType,
        },
      })),
      layoutOptions: {
        'elk.position': `(0, 0)`, // See 'crossingMinimization.semiInteractive' above
        nodeType: 'graphNode',
      },
    };
  }
};

export const useLayout = (): [Node[], Edge[]] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>([]);
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
        console.log(n);
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
