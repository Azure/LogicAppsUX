import { useEffect, useState } from 'react';
import type { RootState } from '../../core';
import { useSelector } from 'react-redux';
import { getRecordEntry, SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import type { NodesMetadata } from '../../core/state/workflow/workflowInterfaces';

export function useIsAgentSubGraph(nodeId?: string): boolean | null {
  const [isAgentSubgraph, setIsAgentSubgraph] = useState<boolean>(false);
  const { nodesMetadata } = useSelector((state: RootState) => {
    return {
      nodesMetadata: state.workflow.nodesMetadata,
    };
  });

  useEffect(() => {
    setIsAgentSubgraph(isAgentSubgraphFromMetadata(nodeId, nodesMetadata));
  }, [nodeId, nodesMetadata]);
  return isAgentSubgraph;
}

export function isAgentSubgraphFromMetadata(nodeId?: string, nodesMetadata?: NodesMetadata) {
  if (!nodeId || !nodesMetadata) {
    return false;
  }

  const metadata = getRecordEntry(nodesMetadata, nodeId);
  // Check if the node itself is an MCP client tool since there's no parent AGENT_CONDITION node for them
  const isMcpClientTool = metadata?.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT;
  if (isMcpClientTool) {
    return true;
  }

  let nodeGraphId = metadata?.graphId;
  while (nodeId && nodeGraphId) {
    const nodeMetadata = getRecordEntry(nodesMetadata, nodeGraphId);
    if (!nodeMetadata) {
      return false;
    }

    const isAgentCondition = nodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION;
    if (isAgentCondition) {
      return true;
    }

    nodeGraphId = nodeMetadata.graphId;
  }
  return false;
}
