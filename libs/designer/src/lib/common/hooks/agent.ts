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
    let nodeGraphId = getRecordEntry(nodesMetadata, nodeId)?.graphId;

    while (nodeId && nodeGraphId) {
      const nodeMetadata = getRecordEntry(nodesMetadata, nodeGraphId);
      if (!nodeMetadata) {
        return undefined;
      }

      const isAgentCondition = nodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION;
      if (isAgentCondition) {
        setIsAgentSubgraph(true);
      }

      nodeGraphId = nodeMetadata.graphId;
    }
  }, [nodeId, nodesMetadata]);
  return isAgentSubgraph;
}
