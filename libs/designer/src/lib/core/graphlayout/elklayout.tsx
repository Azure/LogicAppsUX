import type { WorkflowNode } from '../parsers/models/workflowNode';
import { isWorkflowNode } from '../parsers/models/workflowNode';
import { useReadOnly } from '../state/designerOptions/designerOptionsSelectors';
import { getRootWorkflowGraphForLayout } from '../state/workflow/workflowSelectors';
import { LogEntryLevel, LoggerService, useThrottledEffect, WORKFLOW_NODE_TYPES, WORKFLOW_EDGE_TYPES } from '@microsoft/logic-apps-shared';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled';
import ELK from 'elkjs/lib/elk.bundled';
import { createContext, useState, useContext } from 'react';
import { useSelector } from 'react-redux';
import type { Edge, Node } from '@xyflow/react';

export const spacing = {
  default: '64',
  readOnly: '48',
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
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  // Spacing values
  'elk.spacing.edgeNode': '40',
  'elk.spacing.edgeEdge': '40',
  'elk.layered.spacing.edgeNodeBetweenLayers': spacing.default,
  'elk.layered.spacing.nodeNodeBetweenLayers': spacing.default,
  'elk.padding': '[top=0,left=16,bottom=16,right=16]',
  // This option allows the first layer children of a graph to be laid out in order of appearance in manifest. This is useful for subgraph ordering, like in Switch nodes.
  // 'elk.layered.crossingMinimization.semiInteractive': 'true',
  'elk.layered.crossingMinimization.forceNodeModelOrder': 'false',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  // Options for Bezier edges (These do not have any effect on our default edges)
  'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
  'elk.edgeRouting': 'SPLINES', // POLYLINE / ORTHOGONAL / SPLINES
  'elk.layered.edgeRouting.splines.mode': 'CONSERVATIVE_SOFT', // SLOPPY / CONSERVATIVE_SOFT / CONSERVATIVE
  'elk.portAlignment.default': 'CENTER', // DISTRIBUTED / CENTER
  'elk.spacing.portPort': '48',
};

const readOnlyOptions: Record<string, string> = {
  'elk.layered.spacing.edgeNodeBetweenLayers': spacing.readOnly,
  'elk.layered.spacing.nodeNodeBetweenLayers': spacing.readOnly,
};

const elk = new ELK();
const defaultEdgeType = WORKFLOW_EDGE_TYPES.BUTTON_EDGE;
const defaultNodeType = WORKFLOW_NODE_TYPES.OPERATION_NODE;

const elkLayout = async (graph: ElkNode, readOnly?: boolean) => {
  const layout = await elk.layout(JSON.parse(JSON.stringify(graph)), {
    layoutOptions: {
      ...defaultLayoutOptions,
      ...(readOnly && readOnlyOptions),
    },
  });
  return layout;
};

const convertElkGraphToReactFlow = (graph: ElkNode): LayoutContextType => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let flowWidth: number = graph?.width ?? 0;
  let flowHeight: number = graph?.height ?? 0;

  let nodeIndex = 1;

  const processChildren = (node: ElkNode) => {
    const edgesBySource: Record<string, Edge[]> = {};
    if (node.edges) {
      // Put edge objects into a record by sourceId
      for (const edge of node.edges as ElkExtendedEdge[]) {
        const tempEdge: Edge = {
          id: edge.id,
          target: edge.targets[0],
          source: edge.sources[0],
          type: edge.layoutOptions?.['edgeType'] ?? defaultEdgeType,
          data: {
            elkEdge: edge,
          },
        };
        if (!edgesBySource[edge.sources[0]]) {
          edgesBySource[edge.sources[0]] = [];
        }
        edgesBySource[edge.sources[0]].push(tempEdge);
      }
    }

    if (node.children) {
      // Sort node.children by y position then x position
      node.children.sort((a, b) => (a.y === b.y ? (a?.x ?? 0) - (b?.x ?? 0) : (a?.y ?? 0) - (b?.y ?? 0)));

      for (const n of node.children as ElkNode[]) {
        const nodeObject: Node = {
          id: n.id,
          position: { x: n.x ?? 0, y: n.y ?? 0 },
          data: {
            label: n.id,
            nodeIndex: nodeIndex++,
          },
          parentId: node.id !== 'root' ? node.id : undefined,
          type: n.layoutOptions?.['nodeType'] ?? defaultNodeType,
        };

        if (n?.children && n.width && n.height) {
          nodeObject.data.size = {
            width: n.width,
            height: n.height,
          };
        }

        const nodeArrayIndex = nodes.push(nodeObject);

        const farWidth = (n?.x ?? 0) + (n?.width ?? 0);
        const farHeight = (n?.y ?? 0) + (n?.height ?? 0);
        if (farWidth > flowWidth) {
          flowWidth = farWidth;
        }
        if (farHeight > flowHeight) {
          flowHeight = farHeight;
        }

        if (n?.children) {
          processChildren(n);
        }

        // Add edges to the edges array
        if (edgesBySource[n.id]) {
          for (const edge of edgesBySource[n.id]) {
            if (edge.data) {
              edge.data['edgeIndex'] = nodeIndex++;
            }
            edges.push(edge);
          }
        }

        // Add leaf index to the node data
        nodes[nodeArrayIndex - 1].data['nodeLeafIndex'] = nodeIndex++;
      }
    }
  };

  processChildren(graph);

  return [nodes, edges, [flowWidth, flowHeight]];
};

const convertWorkflowGraphToElkGraph = (node: WorkflowNode): ElkNode => {
  if (isWorkflowNode(node)) {
    return {
      id: node.id,
      height: node.height,
      width: node.width,
      edges: undefined, // node has no edges
      children: node.children?.map(convertWorkflowGraphToElkGraph),
      layoutOptions: {
        nodeType: node?.type ?? defaultNodeType,
      },
    };
  }

  const children = node.children?.map(convertWorkflowGraphToElkGraph);

  // Remove edges that are pointing to nodes that don't exist
  const filteredEdges =
    node.edges?.filter((edge) => {
      const sourceExists = children?.find((child) => child.id === edge.source);
      if (!sourceExists) {
        return false; // Remove edge if source does not exist
      }
      const targetExists = children?.find((child) => child.id === edge.target);
      if (!targetExists) {
        return false; // Remove edge if target does not exist
      }
      return true; // Keep edge if both source and target exist
    }) ?? [];

  return {
    id: node.id,
    height: node.height,
    width: node.width,
    children,
    edges:
      filteredEdges?.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
        layoutOptions: {
          edgeType: edge?.type ?? defaultEdgeType,
        },
      })) ?? [],
    layoutOptions: {
      'elk.padding': '[top=0,left=16,bottom=48,right=16]', // allow space for add buttons
      'elk.position': '(0, 0)', // See 'crossingMinimization.semiInteractive' above
      nodeType: node?.type ?? WORKFLOW_NODE_TYPES.GRAPH_NODE,
      ...(filteredEdges?.some((edge) => edge.type === WORKFLOW_EDGE_TYPES.ONLY_EDGE) && {
        'elk.layered.nodePlacement.strategy': 'SIMPLE',
        'elk.layered.spacing.edgeNodeBetweenLayers': spacing.onlyEdge,
        'elk.layered.spacing.nodeNodeBetweenLayers': spacing.onlyEdge,
        'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
      }),
      ...(node.children?.findIndex((child) => child.id.endsWith('#footer')) !== -1 && {
        'elk.padding': '[top=0,left=16,bottom=0,right=16]',
      }),
    },
  };
};

type LayoutContextType = [Node[], Edge[], number[]];
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider = ({ children }: any) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [size, setSize] = useState<number[]>([0, 0]);

  const workflowGraph = useSelector(getRootWorkflowGraphForLayout);
  const readOnly = useReadOnly();

  useThrottledEffect(
    () => {
      if (!workflowGraph) {
        return;
      }

      const elkGraph = convertWorkflowGraphToElkGraph(workflowGraph);

      elkLayout(elkGraph, readOnly)
        .then((g) => {
          const [n, e, s] = convertElkGraphToReactFlow(g);
          setNodes(n);
          setEdges(e);
          setSize(s);
        })
        .catch((err) => {
          const graphAsString = JSON.stringify(elkGraph);
          LoggerService().log({
            level: LogEntryLevel.Error,
            area: 'useLayout',
            error: err,
            message: `${err?.message} - ${graphAsString}`,
          });
        });
    },
    [readOnly, workflowGraph],
    200
  );

  return <LayoutContext.Provider value={[nodes, edges, size]}>{children}</LayoutContext.Provider>;
};

export const exportForTesting = {
  convertElkGraphToReactFlow,
  convertWorkflowGraphToElkGraph,
  elkLayout,
};

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
