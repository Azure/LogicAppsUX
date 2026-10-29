import type { IntlShape } from 'react-intl';
import { isWorkflowGraph } from '../parsers/models/workflowNode';
import type { WorkflowEdge, WorkflowNode } from '../parsers/models/workflowNode';
import type { NodesMetadata, Operations, WorkflowState } from '../state/workflow/workflowInterfaces';
import {
  isTemplateExpression,
  hasInvalidChars,
  startsWith,
  equals,
  WORKFLOW_EDGE_TYPES,
  WORKFLOW_NODE_TYPES,
  getRecordEntry,
  SUBGRAPH_TYPES,
} from '@microsoft/logic-apps-shared';
import type { SubgraphType, WorkflowEdgeType, WorkflowNodeType } from '@microsoft/logic-apps-shared';
import type { ElkExtendedEdge, ElkNode } from 'elkjs';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';

export const isRootNode = (nodeId: string, nodesMetadata: NodesMetadata) => {
  return !!getRecordEntry(nodesMetadata, nodeId)?.isRoot;
};

export const isTriggerNode = (nodeId: string, nodesMetadata: NodesMetadata) => {
  return !!getRecordEntry(nodesMetadata, nodeId)?.isTrigger;
};

export const getTriggerNode = (state: WorkflowState): WorkflowNode => {
  const rootGraph = state.graph as WorkflowNode;
  const rootNode = rootGraph?.children?.find((child) => isTriggerNode(child.id, state.nodesMetadata)) as WorkflowNode;
  return rootNode;
};

export const getTriggerNodeId = (state: WorkflowState): string => {
  return getTriggerNode(state)?.id;
};

export const isLeafNodeFromEdges = (edges: WorkflowEdge[]) => {
  return edges.filter((edge) => edge.type !== WORKFLOW_EDGE_TYPES.HIDDEN_EDGE).length === 0;
};

// This is the starting size for all nodes
export const DEFAULT_NODE_SIZE = {
  width: 200,
  height: 40,
};
// Canonical attached connector: half diamond + gap + label16 + spacingS8 + line + half dot.
export const AGENT_TOOL_CONNECTOR_HEIGHT =
  nodeMetrics.toolConnector.diamond / 2 +
  nodeMetrics.toolConnector.gap +
  16 +
  8 +
  nodeMetrics.toolConnector.line +
  nodeMetrics.handle.size / 2;

export interface NodePresentationContext {
  operationType?: string;
  subgraphType?: SubgraphType;
  caseCount?: number;
  toolKind?: 'action' | 'mcp' | 'subWorkflow';
  hasToolStatus?: boolean;
}

export interface NodePresentation {
  shared: boolean;
  size?: { width: number; height: number };
  family?: 'scope' | 'if' | 'switch' | 'loop' | 'agent' | 'branch' | 'tool' | 'add' | 'frame' | 'placeholder' | 'collapsed';
  toolKind?: NodePresentationContext['toolKind'];
}

/** One admission decision for the renderer AND ELK. Raw identity is resolved by the host, never from a caption. */
export const getNodePresentation = (
  type: WorkflowNodeType | undefined,
  useSharedNodeUi = false,
  context: NodePresentationContext = {}
): NodePresentation => {
  const operation = type === undefined || type === WORKFLOW_NODE_TYPES.OPERATION_NODE;
  if (!useSharedNodeUi) {
    return { shared: false };
  }
  const toolSize = {
    width: nodeMetrics.cards.tool.width,
    height: nodeMetrics.cards.tool.smallHeight + (context.hasToolStatus ? nodeMetrics.badge.overhang : 0),
  };
  if (operation) {
    if (context.toolKind) {
      return {
        shared: true,
        family: 'tool',
        toolKind: context.toolKind,
        size: toolSize,
      };
    }
    return { shared: true, size: nodeMetrics.cards.action };
  }
  const { operationType, subgraphType } = context;
  if (type === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE) {
    switch (operationType?.toLowerCase()) {
      case 'if':
        return { shared: true, family: 'if', size: nodeMetrics.cards.condition };
      case 'switch':
        // The host flows DOWN. Canonical Switch uses the compact 74px body in this axis.
        return {
          shared: true,
          family: 'switch',
          size: {
            width: Math.max(
              nodeMetrics.cards.condition.width,
              (context.caseCount ?? 1) * nodeMetrics.handle.size + Math.max(0, (context.caseCount ?? 1) - 1) * 8 + 32
            ),
            height: nodeMetrics.cards.condition.height,
          },
        };
      case 'foreach':
      case 'until':
        return { shared: true, family: 'loop', size: nodeMetrics.cards.loop };
      case 'agent':
        return {
          shared: true,
          family: 'agent',
          size: {
            width: nodeMetrics.cards.agent.width,
            height: nodeMetrics.cards.agent.headerHeight + nodeMetrics.cards.agent.modelHeight + AGENT_TOOL_CONNECTOR_HEIGHT,
          },
        };
      case 'scope':
        return { shared: true, family: 'scope', size: nodeMetrics.cards.action };
      default:
        return { shared: false };
    }
  }
  if (type === WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE && subgraphType) {
    if (subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION || subgraphType === SUBGRAPH_TYPES.MCP_CLIENT) {
      return {
        shared: true,
        family: 'tool',
        toolKind: context.toolKind ?? (subgraphType === SUBGRAPH_TYPES.MCP_CLIENT ? 'mcp' : 'action'),
        size: toolSize,
      };
    }
    if (subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE || subgraphType === SUBGRAPH_TYPES.AGENT_ADD_CONDITON) {
      return { shared: true, family: 'add', size: { width: nodeMetrics.cards.action.width, height: 44 } };
    }
    return { shared: true, family: 'branch', size: { width: nodeMetrics.frame.minWidth, height: nodeMetrics.handle.labeledHeight + 16 } };
  }
  if (type === WORKFLOW_NODE_TYPES.GRAPH_NODE || type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE) {
    return { shared: true, family: 'frame' };
  }
  if (type === WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE) {
    return { shared: true, family: 'placeholder', size: nodeMetrics.cards.trigger };
  }
  if (type === WORKFLOW_NODE_TYPES.COLLAPSED_NODE) {
    return { shared: true, family: 'collapsed', size: { width: nodeMetrics.cards.action.width, height: 50 } };
  }
  // Notes keep their editor/position contract. Hidden nodes remain layout-only, including children.
  return { shared: false };
};

// Creating generic layout nodes and edges below

export const createWorkflowNode = (id: string, type?: WorkflowNodeType): WorkflowNode => ({
  id,
  ...DEFAULT_NODE_SIZE,
  type: type ?? WORKFLOW_NODE_TYPES.OPERATION_NODE,
});

export const createElkNode = (id: string, type?: WorkflowNodeType): ElkNode => ({
  id,
  ...DEFAULT_NODE_SIZE,
  layoutOptions: {
    nodeType: type ?? WORKFLOW_NODE_TYPES.OPERATION_NODE,
  },
});

export const createWorkflowEdge = (source: string, target: string, type?: WorkflowEdgeType): WorkflowEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: type ?? WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
});

export const createElkEdge = (source: string, target: string, type?: WorkflowEdgeType): ElkExtendedEdge => ({
  id: `${source}-${target}`,
  sources: [source],
  targets: [target],
  layoutOptions: {
    edgeType: type ?? WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
  },
});

export const getUpstreamNodeIds = (
  nodeId: string,
  rootGraph: WorkflowNode,
  nodesMetadata: NodesMetadata,
  operationMap: Record<string, string>
): string[] => {
  const graph = getGraphNode(nodeId, rootGraph, nodesMetadata) as WorkflowNode;
  const sourceNodeIds = isWorkflowGraph(graph) ? getAllSourceNodeIds(graph, nodeId, operationMap) : [];
  const allParentNodeIds = getAllParentsForNode(nodeId, nodesMetadata);

  for (const parentNodeId of allParentNodeIds) {
    const graphContainingNode = getGraphNode(parentNodeId, rootGraph, nodesMetadata);
    if (graphContainingNode) {
      sourceNodeIds.push(...getAllSourceNodeIds(graphContainingNode, parentNodeId, operationMap), parentNodeId);
    }
  }
  return sourceNodeIds;
};

export const getNode = (nodeId: string, currentNode: WorkflowNode): WorkflowNode | undefined => {
  if (currentNode.id === nodeId) {
    return currentNode;
  }
  let result: WorkflowNode | undefined;
  for (const child of currentNode.children ?? []) {
    result = getNode(nodeId, child as WorkflowNode);

    if (result) {
      return result;
    }
  }

  return result;
};

export const getGraphNode = (nodeId: string, node: WorkflowNode, nodesMetadata: NodesMetadata): WorkflowNode | undefined => {
  const nodeMetadata = getRecordEntry(nodesMetadata, nodeId);
  if (!nodeMetadata) {
    return undefined;
  }
  return getNode(nodeMetadata.graphId, node);
};

export const getImmediateSourceNodeIds = (graph: WorkflowNode, nodeId: string): string[] => {
  return (graph?.edges ?? [])
    .filter((edge) => edge.target === nodeId && !/#(scope|subgraph|footer)/i.test(edge.id))
    .map((edge) => edge.source);
};

export const getNewNodeId = (state: WorkflowState, nodeId: string): string => {
  let newNodeId = nodeId;
  let count = 1;
  while (getRecordEntry(state.operations, newNodeId)) {
    newNodeId = `${nodeId}_${count}`;
    count++;
  }

  return newNodeId;
};

const getAllSourceNodeIds = (graph: WorkflowNode, nodeId: string, operationMap: Record<string, string>): string[] => {
  const visited: string[] = [];
  const visit = [...getImmediateSourceNodeIds(graph, nodeId)];

  while (visit.length) {
    const current = visit.shift() as string;
    if (visited.indexOf(current) < 0) {
      visited.push(current);
      visited.push(...getAllNodesInsideNode(current, graph, operationMap));
      visit.push(...getImmediateSourceNodeIds(graph, current));
    }
  }
  return visited;
};

export const getAllParentsForNode = (nodeId: string, nodesMetadata: NodesMetadata, useGraphParents = false): string[] => {
  const { parentNodeId, graphId } = getRecordEntry(nodesMetadata, nodeId) ?? {};
  let currentParent = useGraphParents ? graphId : parentNodeId;
  const result: string[] = [];

  while (currentParent) {
    result.push(currentParent);
    const { parentNodeId, graphId } = getRecordEntry(nodesMetadata, currentParent) ?? {};
    currentParent = useGraphParents ? graphId : parentNodeId;
  }

  // Add any nodes that are a handoff parent of the node
  for (const [id, metadata] of Object.entries(nodesMetadata)) {
    if (Object.values(metadata.handoffs ?? {})?.includes(nodeId)) {
      result.push(id);
    }
  }

  return result;
};

export const getAllNodesInsideNode = (nodeId: string, graph: WorkflowNode, operationMap: Record<string, string>): string[] => {
  const currentGraph = getNode(nodeId, graph) as WorkflowNode;
  const result: string[] = [];

  if (isWorkflowGraph(currentGraph)) {
    for (const child of currentGraph.children as WorkflowNode[]) {
      const childId = child.id;
      if (getRecordEntry(operationMap, childId)) {
        result.push(childId);
      }

      result.push(...getAllNodesInsideNode(childId, child, operationMap));
    }
  }

  return result;
};

export const getFirstParentOfType = (
  nodeId: string,
  type: string,
  nodesMetadata: NodesMetadata,
  operations: Operations
): string | undefined => {
  const parentNodeId = getRecordEntry(nodesMetadata, nodeId)?.parentNodeId;

  if (parentNodeId) {
    if (equals(getRecordEntry(operations, parentNodeId)?.type, type)) {
      return parentNodeId;
    }

    return getRecordEntry(nodesMetadata, parentNodeId)?.parentNodeId
      ? getFirstParentOfType(getRecordEntry(nodesMetadata, parentNodeId)?.parentNodeId as string, type, nodesMetadata, operations)
      : getFirstParentOfType(parentNodeId, type, nodesMetadata, operations);
  }

  return undefined;
};

export const isOperationNameValid = (
  nodeId: string,
  newName: string,
  isTrigger: boolean,
  nodesMetadata: NodesMetadata,
  idReplacements: Record<string, string>,
  intl: IntlShape
): { isValid: boolean; message: string } => {
  const name = transformOperationTitle(newName);
  const subgraphType = getRecordEntry(nodesMetadata, nodeId)?.subgraphType;

  const messages = {
    DEFAULT: intl.formatMessage({
      id: '0xLWzG',
      defaultMessage: 'The name already exists or is invalid. Update the name before you continue.',
      description: 'Text for invalid operation title name',
    }),
    AGENT_CONDITION: intl.formatMessage({
      id: 'cd+qhI',
      defaultMessage: 'Enter a valid tool name using only alphanumeric characters, starting with a letter (max 48 characters).',
      description: 'Text for invalid agent tool name',
    }),
  };

  // Check for invalid characters.
  if (!subgraphType && !isTrigger && startsWith(name, 'internal.')) {
    return { isValid: false, message: messages.DEFAULT };
  }

  if (!name || isTemplateExpression(name) || name.length > 80 || hasInvalidChars(name, [':', '#', '<', '>', '%', '&', '\\', '?', '/'])) {
    return { isValid: false, message: messages.DEFAULT };
  }

  // Agent condition specific validation
  if (subgraphType === 'AGENT_CONDITION') {
    const agentPattern = /^[A-Za-z_][A-Za-z0-9_]{0,47}$/;
    if (!agentPattern.test(name)) {
      return { isValid: false, message: messages.AGENT_CONDITION };
    }
  }

  // Check for name uniqueness.
  const existingNames = Object.keys(nodesMetadata).map((id) => getRecordEntry(idReplacements, id) ?? id);
  const isDuplicateName = existingNames.some((nodeName) => equals(nodeName, name));
  if (isDuplicateName) {
    return { isValid: false, message: messages.DEFAULT };
  }
  return { isValid: true, message: '' };
};

export const transformOperationTitle = (title: string): string => title.replaceAll(' ', '_');
