import type { WorkflowEdge, WorkflowNode } from '../../parsers/models/workflowNode';
import { WORKFLOW_NODE_TYPES, WORKFLOW_EDGE_TYPES } from '../../parsers/models/workflowNode';
import type { RootState } from '../../store';
import { createWorkflowEdge } from '../../utils/graph';
import type { WorkflowState } from './workflowSlice';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

const selectWorkflow = (state: RootState): WorkflowState => state.workflow;

export const getWorkflowData = (state: RootState): WorkflowState => state.workflow;
export const getRootWorkflowGraphForLayout = createSelector(getWorkflowData, (data) => {
  const rootNode = data.graph;
  const collapsedIds = data.collapsedGraphIds;
  if (Object.keys(collapsedIds).length === 0) return rootNode;
  if (!rootNode) return undefined;
  const newGraph = {
    ...rootNode,
    children: reduceCollapsed((node: WorkflowNode) => collapsedIds?.[node.id])(rootNode.children ?? []),
  };

  return newGraph;
});

const nonfilteredNodeTypes = [WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE];
const filterOutGraphChildren = (children: WorkflowNode[]) => children?.filter((child) => nonfilteredNodeTypes.includes(child.type));
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
  return useSelector(
    createSelector(
      (state: RootState) => {
        if (!actionId) return undefined;
        return getWorkflowNodeFromState(state, actionId);
      },
      (node) => node
    )
  );
};

export const useEdgesBySource = (parentId?: string): WorkflowEdge[] =>
  useSelector(
    createSelector(selectWorkflow, (state: WorkflowState) => {
      if (!parentId || !state.graph) return [];
      const reduceGraph = (graph: WorkflowNode, arr: WorkflowEdge[] = []): WorkflowEdge[] => {
        const edges = (graph?.edges ?? []).filter((x) => x.source === parentId);
        const childEdges = graph.children?.reduce((acc, child) => reduceGraph(child, acc), edges) ?? [];
        return [...arr, ...childEdges];
      };
      return reduceGraph(state.graph);
    })
  );

// export const useEdgesByTarget = (childId?: string): WorkflowEdge[] => {
//   return useSelector((state: RootState) => {
//     if (!childId) {
//       return [];
//     }
//     const edges: WorkflowEdge[] = [];
//     const traverseGraph = (graph: WorkflowNode): void => {
//       edges.push(...(graph?.edges ?? []));
//       graph.children?.forEach(traverseGraph);
//     };
//     if (state.workflow.graph) {
//       traverseGraph(state.workflow.graph);
//     }
//     return edges.filter((x) => x.target === childId);
//   });
// };
