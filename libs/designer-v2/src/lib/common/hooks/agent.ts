import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core';
import type { NodesMetadata } from '../../core/state/workflow/workflowInterfaces';
import { getRecordEntry, SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';

/**
 * Utility function to check if a node is inside an agent subgraph (agent loop).
 * This is a non-hook version that can be used in thunks and other non-component contexts.
 * @param nodeId - The ID of the node to check
 * @param nodesMetadata - The nodes metadata from the workflow state
 * @returns true if the node is inside an agent loop, false otherwise
 */
export function isNodeInAgentSubgraph(nodeId: string | undefined, nodesMetadata: NodesMetadata): boolean {
  if (!nodeId || !nodesMetadata) {
    return false;
  }

  // First check if the node itself is an agent tool (MCP client case)
  const currentNodeMetadata = getRecordEntry(nodesMetadata, nodeId);
  if (currentNodeMetadata) {
    const isAgentTool =
      currentNodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION || currentNodeMetadata.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT;
    if (isAgentTool) {
      return true;
    }
  }

  // Then traverse up the graph hierarchy
  let nodeGraphId = currentNodeMetadata?.graphId;

  while (nodeGraphId) {
    const nodeMetadata = getRecordEntry(nodesMetadata, nodeGraphId);
    if (!nodeMetadata) {
      return false;
    }

    const isAgentTool =
      nodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION || nodeMetadata.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT;
    if (isAgentTool) {
      return true;
    }

    nodeGraphId = nodeMetadata.graphId;
  }

  return false;
}

/**
 * React hook to check if a node is inside an agent subgraph (agent loop).
 * Use this in React components. For non-component contexts (like thunks), use isNodeInAgentSubgraph instead.
 * @param nodeId - The ID of the node to check
 * @returns true if the node is inside an agent loop, false otherwise
 */
export function useIsAgentSubGraph(nodeId?: string): boolean {
  const nodesMetadata = useSelector((state: RootState) => state.workflow.nodesMetadata);

  // Memoize the calculation to avoid recalculating on every render
  return useMemo(() => isNodeInAgentSubgraph(nodeId, nodesMetadata), [nodeId, nodesMetadata]);
}
