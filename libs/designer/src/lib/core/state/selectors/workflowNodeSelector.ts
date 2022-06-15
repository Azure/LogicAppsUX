import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from '../../parsers/models/workflowNode';
import { isWorkflowGraph } from '../../parsers/models/workflowNode';
import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const getWorkflowNodeFromState = (state: RootState, actionId: string) => {
  const graph = state.workflow.graph;
  const traverseGraph = (workflowGraph: WorkflowGraph): WorkflowGraph | WorkflowNode | undefined => {
    for (const actionNode of workflowGraph.children) {
      if (actionNode.id === actionId) {
        return actionNode;
      }

      const nestedGraphs = actionNode.children?.filter((g) => g.children?.length) ?? [];
      for (const graph of nestedGraphs) {
        const node = traverseGraph(graph);
        if (node) {
          return node;
        }
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

export const useEdgesByParent = (parentId?: string): WorkflowEdge[] => {
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

export const useEdgesByChild = (childId?: string): WorkflowEdge[] => {
  return useSelector((state: RootState) => {
    if (!childId) {
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
    return edges.filter((x) => x.target === childId);
  });
};
