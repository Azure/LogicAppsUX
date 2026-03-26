import { isBuiltInAgentTool, SUBGRAPH_TYPES, WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import type { WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { createWorkflowEdge, createWorkflowNode } from '../utils/graph';
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

    // Dynamically inject built-in tool nodes (e.g. code_interpreter) that appear in runtime
    // but don't exist as graph children (they're configured via agentModelSettings, not in workflow JSON)
    const runtimeTools = scopeRepetitionRunData.tools ?? {};
    const existingChildIds = new Set((agentGraph.children ?? []).map((c) => c.id));

    Object.keys(runtimeTools).forEach((toolId) => {
      if (!isBuiltInAgentTool(toolId)) {
        return;
      }

      // Create graph node only if it doesn't exist yet
      if (!existingChildIds.has(toolId)) {
        const subgraphCardNode = createWorkflowNode(`${toolId}-#subgraph`, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE);
        const toolGraph: WorkflowNode = {
          id: toolId,
          children: [subgraphCardNode],
          edges: [],
          type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
          subGraphLocation: 'tools',
        };
        agentGraph.children = [...(agentGraph.children ?? []), toolGraph];

        const headerId = `${agentGraph.id}-#scope`;
        agentGraph.edges = [...(agentGraph.edges ?? []), createWorkflowEdge(headerId, toolId, WORKFLOW_EDGE_TYPES.ONLY_EDGE)];

        // Update the saved original graph so the node persists across iteration switches
        state.agentsGraph[agentGraph.id] = {
          ...state.agentsGraph[agentGraph.id],
          children: [...(state.agentsGraph[agentGraph.id]?.children ?? []), toolGraph],
          edges: [...(state.agentsGraph[agentGraph.id]?.edges ?? []), createWorkflowEdge(headerId, toolId, WORKFLOW_EDGE_TYPES.ONLY_EDGE)],
        };
      }

      // Always ensure nodesMetadata has subgraphType AGENT_CONDITION — this is required for
      // the SubgraphCardNode to render the card on the canvas. We re-apply it on every call
      // because other reducers (clearAllRepetitionRunData, updateAgenticMetadata) or async
      // thunks (fetchBuiltInToolRunData) may have replaced the metadata object between
      // dispatches. Merging preserves any runData/runIndex set by those reducers.
      const existing = state.nodesMetadata[toolId];
      state.nodesMetadata[toolId] = {
        ...existing,
        graphId: agentGraph.id,
        parentNodeId: agentGraph.id,
        subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION,
        actionCount: existing?.actionCount ?? 0,
        isRoot: false,
        isTrigger: false,
      } as any;
    });

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
