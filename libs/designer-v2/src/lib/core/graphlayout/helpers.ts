import {
  getRecordEntry,
  labelCase,
  removeIdTag,
  SUBGRAPH_TYPES,
  WORKFLOW_EDGE_TYPES,
  WORKFLOW_NODE_TYPES,
} from '@microsoft/logic-apps-shared';
import type { WorkflowNode } from '../parsers/models/workflowNode';
import type { NodesMetadata, Operations } from '../state/workflow/workflowInterfaces';
import { hasMcpToolPager, type NodePresentationContext } from '../utils/graph';
import type { ElkNode } from '@microsoft/logic-apps-graph-layout';

export const footerMarker = '#footer';

export interface BranchGroupDecoration {
  /** Body starts after the header on the layout's primary axis. */
  start: number;
  exits: { x: number; y: number }[];
}

export const getBranchGroupDecoration = (graph: ElkNode, horizontal: boolean): BranchGroupDecoration | undefined => {
  const header = graph.children?.find((child) => child.layoutOptions?.nodeType === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE);
  const branches = graph.children?.filter((child) => child.layoutOptions?.nodeType === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE);
  if (!header || !branches?.length) {
    return undefined;
  }
  // Use existing branch bounds and the parent source anchor. This is paint only: there are no extra ELK edges or ports.
  return {
    start: horizontal ? (header.x ?? 0) + (header.width ?? 0) : (header.y ?? 0) + (header.height ?? 0),
    exits: branches.map(({ x = 0, y = 0, width = 0, height = 0 }) => ({
      x: x + (horizontal ? width : width / 2),
      y: y + (horizontal ? height / 2 : height),
    })),
  };
};

export interface GraphPresentationContext {
  operations?: Operations;
  nodesMetadata?: NodesMetadata;
  /** Renamed node captions; titles feed compact card height, matching useNodeDisplayName. */
  idReplacements?: Record<string, string>;
  isMonitoringView?: boolean;
}

export const getWorkflowNodePresentationContext = (node: WorkflowNode, context: GraphPresentationContext = {}): NodePresentationContext => {
  const id = removeIdTag(node.id);
  const operation = context.operations?.[id];
  const metadata = context.nodesMetadata?.[id];
  const parent = metadata?.parentNodeId ? context.operations?.[metadata.parentNodeId] : undefined;
  // Conditional tool bodies also use the Agent as parentNodeId; graphId distinguishes their real actions.
  const directAgentTool = parent?.type?.toLowerCase() === 'agent' && metadata?.graphId === metadata?.parentNodeId;
  const toolRow =
    metadata?.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT ||
    (node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE && directAgentTool) ||
    (node.type === WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE && metadata?.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION);
  const definition = operation ?? (parent && 'tools' in parent ? parent.tools?.[id] : undefined);
  // Canonical one-row-per-tool projects the first real operation's kind, not every descendant into a new row.
  const toolOperation =
    metadata?.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION && definition && 'actions' in definition
      ? Object.values(definition.actions ?? {})[0]
      : definition;
  return {
    operationType: operation?.type,
    title: labelCase(getRecordEntry(context.idReplacements, id) ?? id),
    subgraphType: metadata?.subgraphType,
    caseCount: operation && 'cases' in operation ? Object.keys(operation.cases ?? {}).length + 1 : undefined,
    ...(node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE &&
      hasMcpToolPager(metadata, parent?.type, context.isMonitoringView) && { hasToolPager: true }),
    ...(toolRow && {
      toolKind:
        metadata?.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT
          ? 'mcp'
          : toolOperation?.type?.toLowerCase() === 'workflow'
            ? 'subWorkflow'
            : 'action',
    }),
  };
};

export interface LayoutRelevantData {
  id: string;
  height: number | undefined;
  width: number | undefined;
  type: string | undefined;
  edges: LayoutRelevantEdgeData[] | undefined;
  children: Array<LayoutRelevantData | undefined> | undefined;
  hasFooter: boolean;
  hasOnlyEdge: boolean | undefined;
  presentation?: NodePresentationContext;
}

interface LayoutRelevantEdgeData {
  id: string;
  source: string;
  target: string;
  type: string | undefined;
}

// Helper function to extract only data relevant to elk layout from a WorkflowNode
// This is used to avoid unnecessary re-layouts when non-layout-relevant properties change
export const getLayoutRelevantData = (
  node: WorkflowNode | undefined,
  context?: GraphPresentationContext
): LayoutRelevantData | undefined => {
  if (!node) {
    return undefined;
  }
  return {
    id: node.id,
    height: node.height,
    width: node.width,
    type: node.type,
    // Include properties that affect layoutOptions in convertWorkflowGraphToElkGraph
    edges: node.edges?.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
    })),
    children: node.children?.map((child) => getLayoutRelevantData(child as WorkflowNode, context)),
    ...(context && { presentation: getWorkflowNodePresentationContext(node, context) }),
    hasFooter: node.children?.some((child) => child.id.endsWith(footerMarker)) ?? false,
    hasOnlyEdge: node.edges?.some((edge) => edge.type === WORKFLOW_EDGE_TYPES.ONLY_EDGE),
  };
};
