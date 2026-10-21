import { equals, WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import commonConstants from '../../common/constants';
import type { WorkflowNode } from '../parsers/models/workflowNode';
import { createWorkflowEdge } from '../utils/graph';

/** Native handoff topology, independent of the live parameter store. */
export const adjustHandoffGraph = (
  graph: WorkflowNode,
  operations: Record<string, { type: string }>,
  getHandoffTarget: (actionId: string) => string
): WorkflowNode => {
  const handoffToolIds: string[] = [];
  for (const child of graph.children ?? []) {
    if (equals(operations[child.id]?.type, commonConstants.NODE.TYPE.AGENT)) {
      const tools = child.children?.filter((tool) => tool.subGraphLocation === 'tools');
      for (const tool of tools ?? []) {
        const toolActions = tool.children?.filter((node) => node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE) ?? [];
        if (toolActions.length === 1 && equals(operations[toolActions[0].id]?.type, commonConstants.NODE.TYPE.HANDOFF)) {
          handoffToolIds.push(tool.id);
        }
        const firstHandoff = toolActions.find((action) => equals(operations[action.id]?.type, commonConstants.NODE.TYPE.HANDOFF));
        if (firstHandoff) {
          graph = {
            ...graph,
            edges: [
              ...(graph.edges ?? []),
              createWorkflowEdge(child.id, getHandoffTarget(firstHandoff.id), WORKFLOW_EDGE_TYPES.HANDOFF_EDGE),
            ],
          };
        }
      }
    }
  }
  return handoffToolIds.length ? filterOutNodeIdsRecursive(graph, handoffToolIds) : graph;
};

const filterOutNodeIdsRecursive = (node: WorkflowNode, idsToFilter: string[]): WorkflowNode => ({
  ...node,
  children: (node.children?.filter((child) => !idsToFilter.includes(child.id)) ?? []).map((child) =>
    filterOutNodeIdsRecursive(child, idsToFilter)
  ),
  edges: node.edges?.filter((edge) => !idsToFilter.includes(edge.source) && !idsToFilter.includes(edge.target)) ?? [],
});
