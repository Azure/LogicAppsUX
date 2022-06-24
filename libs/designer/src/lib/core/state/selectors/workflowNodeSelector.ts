import type { WorkflowEdge, WorkflowNode } from '../../parsers/models/workflowNode';
import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const getWorkflowNodeFromState = (state: RootState, actionId: string) => {
  const graph = state.workflow.graph;

  const traverseGraph = (node: WorkflowNode): WorkflowNode | undefined => {
    if (node.id === actionId) return node;
    else {
      let result = undefined;
      for (const child of node.children ?? []) result = traverseGraph(child);
      return result;
    }
  };

  return graph ? traverseGraph(graph) : undefined;
};

export const useWorkflowNode = (actionId?: string) => {
  return useSelector((state: RootState) => {
    if (!actionId) {
      return undefined;
    }
    return getWorkflowNodeFromState(state, actionId);
  });
};

export const useEdgesBySource = (parentId?: string): WorkflowEdge[] => {
  return useSelector((state: RootState) => {
    if (!parentId) {
      return [];
    }
    const edges: WorkflowEdge[] = [];
    const traverseGraph = (graph: WorkflowNode): void => {
      edges.push(...(graph?.edges ?? []));
      graph.children?.forEach(traverseGraph);
    };
    if (state.workflow.graph) {
      traverseGraph(state.workflow.graph);
    }
    return edges.filter((x) => x.source === parentId);
  });
};

export const useEdgesByTarget = (childId?: string): WorkflowEdge[] => {
  return useSelector((state: RootState) => {
    if (!childId) {
      return [];
    }
    const edges: WorkflowEdge[] = [];
    const traverseGraph = (graph: WorkflowNode): void => {
      edges.push(...(graph?.edges ?? []));
      graph.children?.forEach(traverseGraph);
    };
    if (state.workflow.graph) {
      traverseGraph(state.workflow.graph);
    }
    return edges.filter((x) => x.target === childId);
  });
};
