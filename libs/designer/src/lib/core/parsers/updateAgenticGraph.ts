import { removeCaseTag } from '@microsoft/logic-apps-shared';
import type { WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { reassignEdgeSources, removeEdge } from './restructuringHelpers';

export interface UpdateAgenticGraphPayload {
  nodeId: string;
  tools: Record<string, any>;
}

export const updateNodeGraph = (payload: UpdateAgenticGraphPayload, workflowGraph: WorkflowNode, state: WorkflowState) => {
  if (!workflowGraph.id) {
    throw new Error('Workflow graph is missing an id');
  }
  const { nodeId, tools } = payload;
  const normalizedId = removeCaseTag(nodeId);

  const agentGraph = workflowGraph.children?.find((child) => child.id === normalizedId);

  if (agentGraph && tools) {
    let originalAgentGraph: WorkflowNode | undefined;
    if (agentGraph?.id in state.agentsGraph) {
      originalAgentGraph = { ...state.agentsGraph[agentGraph.id] };
    } else {
      originalAgentGraph = { ...agentGraph };
      state.agentsGraph[agentGraph.id] = { ...agentGraph };
    }

    agentGraph.children = originalAgentGraph?.children;
    agentGraph.edges = originalAgentGraph?.edges;

    const agentTools = agentGraph?.children ?? [];
    const hidingTools: string[] = [];

    const filteredTools = agentTools.filter((tool) => {
      if (tool.id.includes('#scope') || tool.id.includes('-addCase')) {
        return true;
      }
      const isToolVisible = tool.id in tools;
      if (!isToolVisible) {
        hidingTools.push(tool.id);
      }
      return isToolVisible;
    });

    hidingTools.forEach((tool) => {
      const parentId = (agentGraph.edges ?? []).find((edge) => edge.target === tool)?.source ?? '';
      reassignEdgeSources(state, tool, parentId, workflowGraph, true);
      removeEdge(state, parentId, tool, agentGraph);
    });

    agentGraph.children = filteredTools;
  }
};
