import type { WorkflowEdge, WorkflowNode } from '../../parsers/models/workflowNode';
import { WORKFLOW_EDGE_TYPES } from '../../parsers/models/workflowNode';
import type { RootState } from '../../store';
import { createWorkflowEdge } from '../../utils/graph';
import type { WorkflowState } from './workflowSlice';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export const getWorkflowData = (state: RootState): WorkflowState => state.workflow;
export const getWorkflowGraph = createSelector(getWorkflowData, (data) => {
  const rootNode = data.graph;
  const collapsedIds = data.collapsedGraphIds;
  if (Object.keys(collapsedIds).length === 0) return rootNode;
  if (!rootNode) return undefined;
  const newGraph = {
    ...rootNode,
    children: reduceCollapsed((node: WorkflowNode) => collapsedIds?.[node.id])(rootNode.children ?? []),
  };

  console.log(newGraph);
  return newGraph;
});

const filterOutGraphChildren = (children: WorkflowNode[]) => children?.filter((child) => child.id.includes('-#'));
const reduceCollapsed =
  (condition: (arg0: WorkflowNode) => any) =>
  (nodes: WorkflowNode[]): any => {
    return nodes.reduce((acc: any, child: WorkflowNode) => {
      const shouldFilter = condition(child);
      if (!shouldFilter) return [...acc, { ...child, ...{ children: reduceCollapsed(condition)(child.children ?? []) } }];

      const filteredChildren = filterOutGraphChildren(child.children ?? []);
      const filteredEdges =
        filteredChildren.length === 2
          ? [createWorkflowEdge(filteredChildren[0]?.id, filteredChildren[1]?.id, WORKFLOW_EDGE_TYPES.HIDDEN_EDGE)]
          : [];
      return [...acc, { ...child, ...{ children: filteredChildren, edges: filteredEdges } }];
    }, []);
  };

export const useAllCollapsedGraphs = createSelector(getWorkflowData, (data) => data.collapsedGraphIds);
export const useIsGraphCollapsed = (graphId: string): boolean =>
  useSelector((state: RootState): boolean => state.workflow.collapsedGraphIds?.[graphId]);

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
