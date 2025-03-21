import { removeCaseTag } from '@microsoft/logic-apps-shared';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { current } from '@reduxjs/toolkit';

export interface UpdateAgenticGraphPayload {
  nodeId: string;
  tools: Record<string, any>;
}

export const updateNodeGraph = (
  payload: UpdateAgenticGraphPayload,
  workflowGraph: WorkflowNode,
  _nodesMetadata: NodesMetadata,
  _state: WorkflowState
) => {
  if (!workflowGraph.id) {
    throw new Error('Workflow graph is missing an id');
  }
  const { nodeId, tools } = payload;
  const normalizedId = removeCaseTag(nodeId);

  const agentGraph = workflowGraph.children?.find((child) => child.id === normalizedId);
  if (agentGraph && tools) {
    const agentTools = agentGraph?.children ?? [];

    console.log('Agent tools: ', current(agentTools));

    const filteredTools = agentTools.filter((tool) => {
      if (tool.id.includes('#scope') || tool.id.includes('-addCase')) {
        return true;
      }
      return tool.id in tools;
    });

    console.log('Filtered tools: ', filteredTools);

    agentGraph.children = filteredTools;
  }
};
