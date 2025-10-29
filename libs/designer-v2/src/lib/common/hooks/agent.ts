import { useEffect, useState } from 'react';
import type { RootState } from '../../core';
import { useSelector } from 'react-redux';
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

  let nodeGraphId = getRecordEntry(nodesMetadata, nodeId)?.graphId;

  while (nodeGraphId) {
    const nodeMetadata = getRecordEntry(nodesMetadata, nodeGraphId);
    if (!nodeMetadata) {
      return false;
    }

    if (nodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION) {
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
export function useIsAgentSubGraph(nodeId?: string): boolean | null {
  const [isAgentSubgraph, setIsAgentSubgraph] = useState<boolean>(false);
  const { nodesMetadata } = useSelector((state: RootState) => {
    return {
      nodesMetadata: state.workflow.nodesMetadata,
    };
  });

  useEffect(() => {
    setIsAgentSubgraph(isNodeInAgentSubgraph(nodeId, nodesMetadata));
  }, [nodeId, nodesMetadata]);

  return isAgentSubgraph;
}
