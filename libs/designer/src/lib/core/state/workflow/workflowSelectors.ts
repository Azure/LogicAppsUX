import type { WorkflowEdge, WorkflowNode } from '../../parsers/models/workflowNode';
import { WORKFLOW_NODE_TYPES, WORKFLOW_EDGE_TYPES } from '../../parsers/models/workflowNode';
import type { RootState } from '../../store';
import { createWorkflowEdge } from '../../utils/graph';
import type { WorkflowState } from './workflowInterfaces';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export const getWorkflowState = (state: RootState): WorkflowState => state.workflow;

export const useNodeMetadata = (id?: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => (id ? state.nodesMetadata[id] : undefined)));

export const useActionMetadata = (id?: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => (id ? state.operations[id] : undefined)));

export const useNodeDescription = (id: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => (id ? state.operations[id]?.description : undefined)));

export const getRootWorkflowGraphForLayout = createSelector(getWorkflowState, (data) => {
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

export const useIsGraphCollapsed = (graphId: string): boolean =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState): boolean => state.collapsedGraphIds?.[graphId]));

export const useEdgesBySource = (parentId?: string): WorkflowEdge[] =>
  useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (!parentId || !state.graph) return [];

      const reduceGraph = (graph: WorkflowNode, arr: WorkflowEdge[] = []): WorkflowEdge[] => {
        if (!graph.edges) return arr;
        const edges = graph.edges.filter((x) => x.source === parentId);
        const childEdges = graph.children?.reduce((acc, child) => reduceGraph(child, acc), edges) ?? [];
        return [...arr, ...childEdges];
      };
      return reduceGraph(state.graph);
    })
  );

export const getWorkflowNodeFromGraphState = (state: WorkflowState, actionId: string) => {
  const graph = state.graph;
  if (!graph) return undefined;

  const traverseGraph = (node: WorkflowNode): WorkflowNode | undefined => {
    if (node.id === actionId) return node;
    else {
      let result;
      for (const child of node.children ?? []) {
        const childRes = traverseGraph(child);
        if (childRes) {
          result = childRes;
        }
      }
      return result;
    }
  };

  return traverseGraph(graph);
};

export const useNodeEdgeTargets = (nodeId?: string): string[] =>
  useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (!nodeId || !state.graph) return [];
      return state.edgeIdsBySource?.[nodeId] ?? [];
    })
  );

export const useWorkflowNode = (actionId?: string) => {
  return useSelector((state: RootState) => {
    if (!actionId) {
      return undefined;
    }
    return getWorkflowNodeFromGraphState(state.workflow, actionId);
  });
};

export const useIsLeafNode = (nodeId: string): boolean => useNodeEdgeTargets(nodeId).length === 0;
