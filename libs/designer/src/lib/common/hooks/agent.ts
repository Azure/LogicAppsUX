import { useEffect, useState } from 'react';
import type { RootState } from '../../core';
import { useSelector } from 'react-redux';
import { getRecordEntry, SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';

export function useIsAgentSubGraph(nodeId?: string): boolean | null {
  const [isAgentSubgraph, setIsAgentSubgraph] = useState<boolean>(false);
  const { nodesMetadata } = useSelector((state: RootState) => {
    return {
      nodesMetadata: state.workflow.nodesMetadata,
    };
  });

  useEffect(() => {
    setIsAgentSubgraph(false);
    const metadata = getRecordEntry(nodesMetadata, nodeId);
    const isMcpClientTool = metadata?.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT;
    if (isMcpClientTool) {
      setIsAgentSubgraph(true);
      return;
    }

    let nodeGraphId = metadata?.graphId;
    while (nodeId && nodeGraphId) {
      const nodeMetadata = getRecordEntry(nodesMetadata, nodeGraphId);
      if (!nodeMetadata) {
        setIsAgentSubgraph(false);
        break;
      }

      if (nodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION) {
        setIsAgentSubgraph(true);
        break;
      }

      nodeGraphId = nodeMetadata.graphId;
    }
  }, [nodeId, nodesMetadata]);
  return isAgentSubgraph;
}
