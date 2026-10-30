import type { WorkflowNode } from '../parsers/models/workflowNode';
import { isWorkflowNode } from '../parsers/models/workflowNode';
import { useReadOnly, useSharedNodeUi } from '../state/designerOptions/designerOptionsSelectors';
import { getNodePresentation, type NodePresentation } from '../utils/graph';
import { useRootWorkflowGraphForLayout } from '../state/workflow/workflowSelectors';
import { isSingleHandoffAction } from '../state/workflow/helper';
import {
  LogEntryLevel,
  LoggerService,
  useThrottledEffect,
  WORKFLOW_NODE_TYPES,
  WORKFLOW_EDGE_TYPES,
  SUBGRAPH_TYPES,
  removeIdTag,
} from '@microsoft/logic-apps-shared';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled';
import ELK from 'elkjs/lib/elk.bundled';
import { createContext, useState, useContext, useLayoutEffect, useRef } from 'react';
import type { Edge, Node } from '@xyflow/react';
import {
  getLayoutRelevantData,
  getWorkflowNodePresentationContext,
  type GraphPresentationContext,
  type LayoutRelevantData,
} from './helpers';
import isEqual from 'lodash.isequal';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';

export const spacing = {
  default: '80',
  readOnly: '40',
  onlyEdge: '20',
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
  'elk.padding': '[top=0,left=20,bottom=20,right=20]',
  // This option allows the first layer children of a graph to be laid out in order of appearance in manifest. This is useful for subgraph ordering, like in Switch nodes.
  // 'elk.layered.crossingMinimization.semiInteractive': 'true',
  'elk.layered.crossingMinimization.forceNodeModelOrder': 'false',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  // Options for Bezier edges (These do not have any effect on our default edges)
  'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
  'elk.edgeRouting': 'SPLINES', // POLYLINE / ORTHOGONAL / SPLINES
  'elk.layered.edgeRouting.splines.mode': 'CONSERVATIVE_SOFT', // SLOPPY / CONSERVATIVE_SOFT / CONSERVATIVE
  'elk.portAlignment.default': 'CENTER', // DISTRIBUTED / CENTER
  'elk.spacing.portPort': '40',
};

const readOnlyOptions: Record<string, string> = {
  'elk.layered.spacing.edgeNodeBetweenLayers': spacing.readOnly,
  'elk.layered.spacing.nodeNodeBetweenLayers': spacing.readOnly,
};

const elk = new ELK();
const defaultEdgeType = WORKFLOW_EDGE_TYPES.BUTTON_EDGE;
const defaultNodeType = WORKFLOW_NODE_TYPES.OPERATION_NODE;

/** Layout-only tool packing is flattened back to the original graph identities before rendering. */
const flattenToolGroups = (node: ElkNode): ElkNode => {
  const toolGroup = node.children?.find((child) => child.layoutOptions?.toolGroup === 'true');
  const children = node.children?.flatMap((child) =>
    child === toolGroup
      ? (child.children ?? []).map((tool) => ({
          ...flattenToolGroups(tool),
          x: (tool.x ?? 0) + (child.x ?? 0),
          y: (tool.y ?? 0) + (child.y ?? 0),
        }))
      : [flattenToolGroups(child)]
  );
  return {
    ...node,
    children,
    edges: [
      ...(node.edges?.filter((edge) => edge.layoutOptions?.layoutOnly !== 'true') ?? []),
      ...(node.layoutOptions?.toolAssociations ? JSON.parse(node.layoutOptions.toolAssociations) : []),
    ],
    ...(toolGroup && {
      layoutOptions: {
        ...node.layoutOptions,
        toolsPanel: JSON.stringify({
          x: toolGroup.x ?? 0,
          y: toolGroup.y ?? 0,
          width: toolGroup.width ?? nodeMetrics.cards.agent.width,
          height: toolGroup.height ?? 0,
          collapsed: toolGroup.layoutOptions?.collapsedTools !== undefined,
          items: toolGroup.layoutOptions?.collapsedTools
            ? JSON.parse(toolGroup.layoutOptions.collapsedTools)
            : (toolGroup.children ?? [])
                .filter((child) => child.layoutOptions?.subgraphType !== SUBGRAPH_TYPES.AGENT_ADD_CONDITON)
                .map((child) => ({ id: child.id })),
        }),
      },
    }),
  };
};

const elkLayout = async (graph: ElkNode, readOnly?: boolean) => {
  const layout = await elk.layout(JSON.parse(JSON.stringify(graph)), {
    layoutOptions: {
      ...defaultLayoutOptions,
      ...(readOnly && readOnlyOptions),
    },
  });
  return flattenToolGroups(layout);
};

const convertElkGraphToReactFlow = (graph: ElkNode, useSharedNodeUi = false, reuseObservedDimensions = false): LayoutContextType => {
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
        if (edge.layoutOptions?.layoutOnly === 'true') {
          continue;
        }
        const tempEdge: Edge = {
          id: edge.id,
          target: edge.targets[0],
          source: edge.layoutOptions?.originalSource ?? edge.sources[0],
          ...(edge.layoutOptions?.sourceHandle && { sourceHandle: edge.layoutOptions.sourceHandle }),
          type: edge.layoutOptions?.['edgeType'] ?? defaultEdgeType,
          ...(edge.layoutOptions?.embeddedToolAssociation === 'true' && { hidden: true }),
          data: {
            elkEdge: edge,
            presentation: { shared: useSharedNodeUi },
          },
        };
        if (!edgesBySource[tempEdge.source]) {
          edgesBySource[tempEdge.source] = [];
        }
        edgesBySource[tempEdge.source].push(tempEdge);
      }
    }

    if (node.children) {
      // Sort node.children by y position then x position
      node.children.sort((a, b) => (a.y === b.y ? (a?.x ?? 0) - (b?.x ?? 0) : (a?.y ?? 0) - (b?.y ?? 0)));

      for (const n of node.children as ElkNode[]) {
        const presentation: NodePresentation = n.layoutOptions?.presentation
          ? JSON.parse(n.layoutOptions.presentation)
          : getNodePresentation(n.layoutOptions?.['nodeType'] as WorkflowNode['type'], useSharedNodeUi);
        const agentPanel =
          presentation.shared && presentation.family === 'agent' && node.layoutOptions?.toolsPanel
            ? JSON.parse(node.layoutOptions.toolsPanel)
            : undefined;
        // ELK packs the header and real tool roots separately; the canonical Agent renders their union.
        const renderedSize = agentPanel
          ? { width: agentPanel.width, height: (node.height ?? 0) - (n.y ?? 0) }
          : { width: n.width, height: n.height };
        const hasObservedDimensions =
          reuseObservedDimensions &&
          !presentation.shared &&
          n.layoutOptions?.dimensionsObserved === 'true' &&
          Number.isFinite(n.width) &&
          Number.isFinite(n.height) &&
          (n.width ?? 0) > 0 &&
          (n.height ?? 0) > 0;
        const nodeObject: Node = {
          id: n.id,
          position: { x: agentPanel?.x ?? n.x ?? 0, y: n.y ?? 0 },
          data: {
            label: n.id,
            nodeIndex: nodeIndex++,
            presentation: agentPanel ? { ...presentation, size: renderedSize } : presentation,
            ...(n.layoutOptions?.branchPorts && { branchPorts: JSON.parse(n.layoutOptions.branchPorts) }),
            ...(n.layoutOptions?.toolsPanel && { toolsPanel: JSON.parse(n.layoutOptions.toolsPanel) }),
            ...(agentPanel && {
              toolsPanel: {
                ...agentPanel,
                bottomPadding: Math.max(0, (node.height ?? 0) - agentPanel.y - agentPanel.height),
              },
            }),
          },
          parentId: node.id !== 'root' ? node.id : undefined,
          type: n.layoutOptions?.['nodeType'] ?? defaultNodeType,
          ...(presentation.shared && renderedSize),
          ...(hasObservedDimensions && { measured: { width: n.width, height: n.height } }),
        };

        if (n?.children && n.width && n.height) {
          nodeObject.data.size = {
            width: n.width,
            height: n.height,
          };
          if (presentation.shared && n.layoutOptions?.operationType?.toLowerCase() === 'foreach') {
            const header = n.children.find((child) => child.layoutOptions?.nodeType === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE);
            if (header) {
              const top = (header.y ?? 0) + (header.height ?? 0) + 40;
              nodeObject.data.bodyFrame = { y: top, height: n.height - top };
            }
          }
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

const convertWorkflowGraphToElkGraph = (
  node: WorkflowNode,
  useSharedNodeUi = false,
  context: GraphPresentationContext = {},
  depth = 0
): ElkNode => {
  const presentation = getNodePresentation(node.type, useSharedNodeUi, getWorkflowNodePresentationContext(node, context));
  if (isWorkflowNode(node)) {
    return {
      id: node.id,
      height: presentation.size?.height ?? node.height,
      width: presentation.size?.width ?? node.width,
      edges: undefined, // node has no edges
      children: node.children?.map((child) => convertWorkflowGraphToElkGraph(child, useSharedNodeUi, context, depth + 1)),
      layoutOptions: {
        nodeType: node?.type ?? defaultNodeType,
        presentation: JSON.stringify(presentation),
        ...(node.dimensionsObserved && { dimensionsObserved: 'true' }),
        ...(context.nodesMetadata?.[removeIdTag(node.id)]?.subgraphType && {
          subgraphType: context.nodesMetadata[removeIdTag(node.id)].subgraphType!,
        }),
      },
    };
  }

  const children = node.children?.map((child) => convertWorkflowGraphToElkGraph(child, useSharedNodeUi, context, depth + 1));
  const operationType = context.operations?.[removeIdTag(node.id)]?.type?.toLowerCase();
  const branchPorts =
    useSharedNodeUi && (operationType === 'if' || operationType === 'switch')
      ? (node.children ?? [])
          .filter((child) => {
            const role = context.nodesMetadata?.[removeIdTag(child.id)]?.subgraphType;
            return role && role !== SUBGRAPH_TYPES.SWITCH_ADD_CASE;
          })
          .map((child) => ({ id: child.id, subgraphType: context.nodesMetadata?.[removeIdTag(child.id)]?.subgraphType }))
      : [];
  const header = children?.find((child) => child.layoutOptions?.nodeType === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE);
  if (header && branchPorts.length) {
    const gap = operationType === 'switch' ? 8 : 16;
    const total = branchPorts.length * nodeMetrics.handle.size + (branchPorts.length - 1) * gap;
    header.layoutOptions = { ...header.layoutOptions, branchPorts: JSON.stringify(branchPorts), 'elk.portConstraints': 'FIXED_POS' };
    header.ports = branchPorts.map((port, index) => ({
      id: `${header.id}::${port.id}`,
      x: (header.width ?? 160) / 2 - total / 2 + nodeMetrics.handle.size / 2 + index * (nodeMetrics.handle.size + gap),
      y: header.height,
      width: 0,
      height: 0,
      layoutOptions: { 'elk.port.side': 'SOUTH' },
    }));
  }

  // Remove edges that are pointing to nodes that don't exist
  const childIdsSet = new Set(children?.map((child) => child.id) ?? []);
  const filteredEdges =
    node.edges?.filter((edge) => {
      if (!childIdsSet.has(edge.source)) {
        return false; // Remove edge if source does not exist
      }
      if (!childIdsSet.has(edge.target)) {
        return false; // Remove edge if target does not exist
      }
      return true; // Keep edge if both source and target exist
    }) ?? [];

  // Child types of nodes like Agent, Switch, Condition
  const nestGraphTypes = [WORKFLOW_NODE_TYPES.SUBGRAPH_NODE, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, WORKFLOW_NODE_TYPES.HIDDEN_NODE];

  const result: ElkNode = {
    id: node.id,
    height: node.height,
    width: node.width,
    children,
    edges:
      filteredEdges?.map((edge) => ({
        id: edge.id,
        sources: [
          header?.id === edge.source && branchPorts.some((port) => port.id === edge.target) ? `${header.id}::${edge.target}` : edge.source,
        ],
        targets: [edge.target],
        layoutOptions: {
          edgeType: edge?.type ?? defaultEdgeType,
          ...(header?.id === edge.source &&
            branchPorts.some((port) => port.id === edge.target) && {
              originalSource: edge.source,
              sourceHandle: edge.target,
            }),
        },
      })) ?? [],
    layoutOptions: {
      'elk.padding': '[top=0,left=20,bottom=40,right=20]', // allow space for add buttons
      'elk.position': '(0, 0)', // See 'crossingMinimization.semiInteractive' above
      // Set node type for layout
      nodeType: node?.type ?? WORKFLOW_NODE_TYPES.GRAPH_NODE,
      presentation: JSON.stringify(presentation),
      ...(operationType && { operationType }),
      ...(context.nodesMetadata?.[removeIdTag(node.id)]?.subgraphType && {
        subgraphType: context.nodesMetadata[removeIdTag(node.id)].subgraphType!,
      }),
      ...(filteredEdges?.some((edge) => edge.type === WORKFLOW_EDGE_TYPES.ONLY_EDGE) && {
        'elk.layered.nodePlacement.strategy': 'SIMPLE',
        'elk.layered.spacing.edgeNodeBetweenLayers': spacing.onlyEdge,
        'elk.layered.spacing.nodeNodeBetweenLayers': spacing.onlyEdge,
        'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
      }),
      // If graph doesn't need space at the bottom for an add button, reduce padding
      ...(node.children?.every((child) => nestGraphTypes.includes(child.type)) && {
        'elk.padding': '[top=0,left=20,bottom=20,right=20]',
      }),
      // If graph has no children, make space for the add button
      ...(node.children?.length === 1 &&
        (node.children[0].type === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE ||
          node.children[0].type === WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE) && {
          'elk.padding': '[top=0,left=20,bottom=60,right=20]',
        }),
      // If graph has a footer, reduce bottom padding further
      ...(node.children?.findIndex((child) => child.id.endsWith('#footer')) !== -1 && {
        'elk.padding': '[top=0,left=20,bottom=0,right=20]',
      }),
      ...(presentation.shared && {
        'elk.nodeSize.constraints': 'MINIMUM_SIZE',
        'elk.nodeSize.minimum': `(${nodeMetrics.frame.minWidth},${
          operationType === 'foreach'
            ? nodeMetrics.cards.loop.height + 40 + nodeMetrics.frame.minBodyHeight
            : nodeMetrics.frame.minBodyHeight
        })`,
      }),
    },
  };
  if (presentation.shared && operationType === 'agent' && header) {
    const tools = (children ?? []).filter((child) => child !== header);
    const definition = context.operations?.[removeIdTag(node.id)];
    // Handoff pruning visits only Agents that are direct children of the input root.
    const toolIds =
      definition && 'tools' in definition
        ? Object.entries(definition.tools ?? {})
            .filter(([, tool]) => depth !== 1 || !('actions' in tool && isSingleHandoffAction(Object.values(tool.actions ?? {}))))
            .map(([id]) => id)
        : [];
    // Agent outputs attach to the panel, not generic inner DropZone padding. Root terminal40 remains intact.
    result.layoutOptions = {
      ...result.layoutOptions,
      'elk.padding': '[top=0,left=20,bottom=0,right=20]',
      // Agent has its own composed bounds, not a separate NodeFrame minimum body.
      'elk.nodeSize.minimum': '(0,0)',
    };
    if (tools.length || toolIds.length) {
      const collapsed = tools.length === 0;
      const collapsedPanelHeight = nodeMetrics.toolsHeader + 2 * 16 + 2;
      // Canonical panel: 16px padding, 20px heading, 16px heading/list gap, 12px row gap.
      // Keep arbitrary multi-action/nested tools intact; their real extents enlarge this local panel.
      const group: ElkNode = {
        id: `${node.id}::tools`,
        ...(collapsed && { width: nodeMetrics.cards.agent.width, height: collapsedPanelHeight }),
        children: tools,
        edges: tools.slice(1).map((tool, index) => ({
          id: `${tools[index].id}::layout::${tool.id}`,
          sources: [tools[index].id],
          targets: [tool.id],
          layoutOptions: { layoutOnly: 'true' },
        })),
        layoutOptions: {
          toolGroup: 'true',
          ...(collapsed && { collapsedTools: JSON.stringify(toolIds.map((id) => ({ id }))) }),
          'elk.padding': collapsed ? '[top=0,left=0,bottom=0,right=0]' : '[top=52,left=16,bottom=16,right=16]',
          'elk.layered.spacing.nodeNodeBetweenLayers': '12',
          'elk.layered.spacing.edgeNodeBetweenLayers': '12',
          'elk.nodeSize.constraints': 'MINIMUM_SIZE',
          'elk.nodeSize.minimum': `(${nodeMetrics.cards.agent.width},${collapsed ? collapsedPanelHeight : 0})`,
          'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        },
      };
      result.children = [header, group];
      result.edges = [
        {
          id: `${node.id}::tools-layout`,
          sources: [header.id],
          targets: [group.id],
          layoutOptions: { layoutOnly: 'true' },
        },
      ];
      // Real association IDs/topology survive but do not paint a second fan-out over embedded rows.
      // They are restored after ELK rather than imposing cross-hierarchy routing on local panel packing.
      result.layoutOptions = {
        ...result.layoutOptions,
        toolAssociations: JSON.stringify(
          filteredEdges.map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
            layoutOptions: {
              edgeType: edge.type,
              ...(edge.source === header.id && edge.type === WORKFLOW_EDGE_TYPES.ONLY_EDGE && { embeddedToolAssociation: 'true' }),
            },
          }))
        ),
        'elk.layered.spacing.nodeNodeBetweenLayers': '0',
        'elk.layered.spacing.edgeNodeBetweenLayers': '0',
      };
    } else {
      // With neither tools nor an actual add-tool node, the source connector's last dot is unattached.
      header.height = (header.height ?? 0) + nodeMetrics.handle.size / 2;
      const headerPresentation = JSON.parse(header.layoutOptions!.presentation);
      header.layoutOptions = {
        ...header.layoutOptions,
        presentation: JSON.stringify({
          ...headerPresentation,
          size: { width: header.width, height: header.height },
        }),
      };
    }
  }
  return result;
};

type LayoutContextType = [Node[], Edge[], number[]];
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider = ({ children }: any) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [size, setSize] = useState<number[]>([0, 0]);

  const workflowGraph = useRootWorkflowGraphForLayout();
  const operations = useSelector((state: RootState) => state.workflow.operations);
  const nodesMetadata = useSelector((state: RootState) => state.workflow.nodesMetadata);
  const readOnly = useReadOnly();
  const useSharedNodeUiOption = useSharedNodeUi();
  const prevLayoutRelevantDataRef = useRef<LayoutRelevantData>();
  const previousOptions = useRef({ readOnly, useSharedNodeUi: useSharedNodeUiOption });
  const lastAcceptedShared = useRef<boolean>();
  const activeRequest = useRef<{
    workflowGraph: typeof workflowGraph;
    readOnly: typeof readOnly;
    useSharedNodeUi: boolean;
    operations: typeof operations;
    nodesMetadata: typeof nodesMetadata;
  }>();

  useLayoutEffect(() => {
    // Invalidate before the throttled callback: an old promise may settle in that window.
    activeRequest.current = { workflowGraph, readOnly, useSharedNodeUi: useSharedNodeUiOption, operations, nodesMetadata };
    if (!workflowGraph) {
      prevLayoutRelevantDataRef.current = undefined;
      lastAcceptedShared.current = undefined;
      setNodes([]);
      setEdges([]);
      setSize([0, 0]);
    }
    return () => {
      activeRequest.current = undefined;
    };
  }, [workflowGraph, readOnly, useSharedNodeUiOption, operations, nodesMetadata]);

  useThrottledEffect(
    () => {
      const request = activeRequest.current;
      if (
        !workflowGraph ||
        request?.workflowGraph !== workflowGraph ||
        request.readOnly !== readOnly ||
        request.useSharedNodeUi !== useSharedNodeUiOption ||
        request.operations !== operations ||
        request.nodesMetadata !== nodesMetadata
      ) {
        return;
      }

      const context = useSharedNodeUiOption ? { operations, nodesMetadata } : undefined;
      const currentLayoutRelevantData = getLayoutRelevantData(workflowGraph, context);
      // If layout-relevant data hasn't changed, skip elk processing
      const currentOptions = { readOnly, useSharedNodeUi: useSharedNodeUiOption };
      if (
        prevLayoutRelevantDataRef.current &&
        isEqual(previousOptions.current, currentOptions) &&
        isEqual(prevLayoutRelevantDataRef.current, currentLayoutRelevantData)
      ) {
        prevLayoutRelevantDataRef.current = currentLayoutRelevantData;
        return;
      }

      const elkGraph = convertWorkflowGraphToElkGraph(workflowGraph, useSharedNodeUiOption, context);
      elkLayout(elkGraph, readOnly)
        .then((g) => {
          if (request !== activeRequest.current) {
            return;
          }
          // A renderer switch must let XYFlow remeasure its different handle components.
          const [n, e, s] = convertElkGraphToReactFlow(
            g,
            useSharedNodeUiOption,
            lastAcceptedShared.current === false && !useSharedNodeUiOption
          );
          setNodes(n);
          setEdges(e);
          setSize(s);
          // Store layout data for next comparison
          prevLayoutRelevantDataRef.current = currentLayoutRelevantData;
          previousOptions.current = currentOptions;
          lastAcceptedShared.current = useSharedNodeUiOption;
        })
        .catch((err) => {
          if (request !== activeRequest.current) {
            return;
          }
          const graphAsString = JSON.stringify(elkGraph);
          LoggerService().log({
            level: LogEntryLevel.Error,
            area: 'useLayout',
            error: err,
            message: `${err?.message} - ${graphAsString}`,
          });
        });
    },
    [readOnly, workflowGraph, useSharedNodeUiOption, operations, nodesMetadata],
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
