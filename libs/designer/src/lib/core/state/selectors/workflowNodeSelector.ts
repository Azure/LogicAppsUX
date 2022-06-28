import type { WorkflowEdge, WorkflowNode } from '../../parsers/models/workflowNode';
import { isWorkflowGraph } from '../../parsers/models/workflowNode';
import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const getWorkflowNodeFromState = (state: RootState, actionId: string) => {
  const graph = state.workflow.graph;

  const traverseGraph = (node: WorkflowNode): WorkflowNode | undefined => {
    if (node.id === actionId) return node;
    else {
      let result;
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

export const useEdgesByParent = (parentId?: string): WorkflowEdge[] => {
  return useSelector((state: RootState) => {
    if (!parentId) {
      return [];
    }
    let edges: WorkflowEdge[] = [];
    const traverseGraph = (gnode: WorkflowNode): void => {
      if (isWorkflowGraph(gnode)) {
        edges = [...edges, ...(gnode?.edges ?? [])];
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
    const traverseGraph = (graph: WorkflowNode): void => {
      if (graph.edges) {
        edges = [...edges, ...graph.edges];
      }
      graph.children?.forEach(traverseGraph);
    };
    if (state.workflow.graph) {
      traverseGraph(state.workflow.graph);
    }
    return edges.filter((x) => x.target === childId);
  });
};
