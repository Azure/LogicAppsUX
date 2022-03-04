import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from '../../parsers/models/workflowNode';
import { isWorkflowGraph } from '../../parsers/models/workflowNode';
import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const getWorkflowNodeFromState = (state: RootState, actionId: string) => {
  const graph = state.workflow.graph;
  const traverseGraph = (gnode: WorkflowGraph): WorkflowGraph | WorkflowNode | undefined => {
    for (const g of gnode.children) {
      if (g.id === actionId) {
        return g;
      }
      const child: WorkflowGraph | undefined = g.children?.filter((c) => c.children).find((c) => traverseGraph(c));
      if (child) {
        return child;
      }
    }
    return undefined;
  };
  if (graph) {
    return traverseGraph(graph);
  }
  return undefined;
};

export const useWorkflowNode = (actionId?: string) => {
  return useSelector((state: RootState) => {
    if (!actionId) {
      return undefined;
    }
    return getWorkflowNodeFromState(state, actionId);
  });
};

export const useEdgesByParent = (parentId?: string) => {
  return useSelector((state: RootState) => {
    if (!parentId) {
      return [];
    }
    let edges: WorkflowEdge[] = [];
    const traverseGraph = (gnode: WorkflowGraph | WorkflowNode): void => {
      if (isWorkflowGraph(gnode)) {
        edges = [...edges, ...gnode.edges];
      }
      gnode.children?.forEach(traverseGraph);
    };
    if (state.workflow.graph) {
      traverseGraph(state.workflow.graph);
    }
    return edges.filter((x) => x.source === parentId);
  });
};
