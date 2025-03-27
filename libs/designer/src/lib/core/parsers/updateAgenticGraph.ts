import type { WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { reassignEdgeSources, removeEdge } from './restructuringHelpers';

export interface UpdateAgenticGraphPayload {
  nodeId: string;
  scopeRepetitionRunData: Record<string, any>;
}

export const updateAgenticSubgraph = (payload: UpdateAgenticGraphPayload, agentGraph: WorkflowNode, state: WorkflowState) => {
  if (!agentGraph.id) {
    throw new Error('Workflow graph is missing an id');
  }
  const { scopeRepetitionRunData } = payload;

  if (agentGraph && scopeRepetitionRunData) {
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

      const isToolVisible = tool.id in (scopeRepetitionRunData.tools ?? {});
      if (!isToolVisible) {
        hidingTools.push(tool.id);
      }
      return isToolVisible;
    });

    hidingTools.forEach((tool) => {
      const parentId = (agentGraph.edges ?? []).find((edge) => edge.target === tool)?.source ?? '';
      reassignEdgeSources(state, tool, parentId, agentGraph, true);
      removeEdge(state, parentId, tool, agentGraph);
    });

    agentGraph.children = filteredTools;
  }
};
