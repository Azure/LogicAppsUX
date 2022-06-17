import type { WorkflowNode } from '../parsers/models/workflowNode';
import { isWorkflowNode } from '../parsers/models/workflowNode';
import { useReadOnly } from '../state/selectors/designerOptionsSelector';
import type { RootState } from '../store';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled';
import ELK from 'elkjs/lib/elk.bundled';
import { useEffect, useState } from 'react';
import type { Edge, Node } from 'react-flow-renderer';
import { useSelector } from 'react-redux';

export const layerSpacing = {
  default: '50',
  readOnly: '32',
  onlyEdge: '16',
};

const defaultLayoutOptions: Record<string, string> = {
  'elk.algorithm': 'org.eclipse.elk.layered',
  'elk.direction': 'DOWN',
  'elk.alignment': 'TOP',
  'elk.layered.layering.strategy': 'INTERACTIVE',
  'elk.edge.type': 'DIRECTED',
  'elk.layered.unnecessaryBendpoints': 'false',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '0',
  'elk.layered.spacing.edgeNodeBetweenLayers': layerSpacing.default,
  'elk.layered.spacing.nodeNodeBetweenLayers': layerSpacing.default,
  'elk.padding': '[top=0,left=16,bottom=16,right=16]',
  // This option allows the first layer children of a graph to be laid out in order of appearance in manifest. This is useful for subgraph ordering, like in Switch nodes.
  'elk.layered.crossingMinimization.semiInteractive': 'true',
};

const readOnlyOptions: Record<string, string> = {
  'elk.layered.spacing.edgeNodeBetweenLayers': layerSpacing.readOnly,
  'elk.layered.spacing.nodeNodeBetweenLayers': layerSpacing.readOnly,
};

const defaultEdgeType = 'buttonEdge';
const defaultNodeType = 'testNode';

const elkLayout = async (graph: ElkNode, readOnly?: boolean) => {
  const elk = new ELK();

  const layout = await elk.layout(JSON.parse(JSON.stringify(graph)), {
    layoutOptions: {
      ...defaultLayoutOptions,
      ...(readOnly && readOnlyOptions),
    },
  });
  return layout;
};

const convertElkGraphToReactFlow = (graph: ElkNode): [Node[], Edge[]] => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const processChildren = (node: ElkNode, parent?: string) => {
    if (node.edges) {
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
    }

    if (parent && parent !== 'root') {
      nodes.push({
        id: node.id,
        position: { x: node.x ?? 0, y: node.y ?? 0 },
        data: { label: node.id },
        parentNode: parent,
        type: node.layoutOptions?.['nodeType'] ?? defaultNodeType,
        style: node.children ? { height: node.height, width: node.width } : undefined,
      });
    }
    if (node.children) {
      for (const n of node.children as ElkNode[]) {
        nodes.push({
          id: n.id,
          position: { x: n.x ?? 0, y: n.y ?? 0 },
          data: { label: n.id },
          parentNode: node.id !== 'root' ? node.id : undefined,
          type: n.layoutOptions?.['nodeType'] ?? defaultNodeType,
          style: n.children ? { height: n.height, width: n.width } : undefined,
        });
        processChildren(n, node.id);
      }
    }
  };
  processChildren(graph);
  return [nodes, edges];
};

const convertWorkflowGraphToElkGraph = (node: WorkflowNode): ElkNode => {
  if (isWorkflowNode(node)) {
    return {
      ...node,
      edges: undefined, // node has no edges
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
        ...(node.edges?.[0]?.type === 'onlyEdge' && {
          'elk.layered.spacing.edgeNodeBetweenLayers': layerSpacing.onlyEdge,
          'elk.layered.spacing.nodeNodeBetweenLayers': layerSpacing.onlyEdge,
        }),
      },
    };
  }
};

export const useLayout = (): [Node[], Edge[]] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<Edge[]>([]);
  const workflowGraph = useSelector((state: RootState) => state.workflow.graph);

  const readOnly = useReadOnly();

  useEffect(() => {
    if (!workflowGraph) {
      return;
    }
    const elkGraph: ElkNode = convertWorkflowGraphToElkGraph(workflowGraph);
    elkLayout(elkGraph, readOnly)
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
