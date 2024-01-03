import constants from '../../../common/constants';
import type { WorkflowEdge, WorkflowNode } from '../../parsers/models/workflowNode';
import type { RootState } from '../../store';
import { createWorkflowEdge, getAllParentsForNode } from '../../utils/graph';
import type { NodesMetadata, WorkflowState } from './workflowInterfaces';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { labelCase, WORKFLOW_NODE_TYPES, WORKFLOW_EDGE_TYPES } from '@microsoft/utils-logic-apps';
import { createSelector } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import Queue from 'yocto-queue';

export const getWorkflowState = (state: RootState): WorkflowState => state.workflow;

export const useNodeDisplayName = (id?: string) => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return id && state.idReplacements[id] ? labelCase(state.idReplacements[id]) : labelCase(id ?? '');
    })
  );
};

export const useNodeReplacedId = (id?: string) => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return id && state.idReplacements[id] ? state.idReplacements[id] : id;
    })
  );
};

export const useReplacedIds = () => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return state.idReplacements;
    })
  );
};

export const useNodeMetadata = (id?: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => (id ? state.nodesMetadata?.[id] : undefined)));

export const useActionMetadata = (id?: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => (id ? state.operations?.[id] : undefined)));

export const useNodeDescription = (id: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => (id ? state.operations?.[id]?.description : undefined)));

export const useShouldNodeFocus = (id: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => state.focusedCanvasNodeId === id));

export const useIsWorkflowDirty = () => useSelector(createSelector(getWorkflowState, (state: WorkflowState) => state.isDirty));

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

export const useNodeEdgeTargets = (nodeId?: string): string[] => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (!nodeId || !state.graph) return [];
      return state.edgeIdsBySource?.[nodeId] ?? [];
    })
  );
};

export const useWorkflowNode = (actionId?: string) => {
  return useSelector((state: RootState) => {
    if (!actionId) {
      return undefined;
    }
    return getWorkflowNodeFromGraphState(state.workflow, actionId);
  });
};

export const useIsGraphEmpty = () => {
  return useSelector((state: RootState) => state.workflow.graph?.children?.length === 0);
};

export const useIsNodeLeafNode = (nodeId: string): boolean => {
  const targets = useNodeEdgeTargets(nodeId);
  const isLeaf = useMemo(() => targets.length === 0, [targets.length]);
  return isLeaf;
};

export const useNodeIds = () => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return Object.keys(state.nodesMetadata);
    })
  );
};

export const useNewSwitchCaseId = () =>
  useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      let caseId = 'Case';
      let caseCount = 1;
      const idList = Object.keys(state.nodesMetadata);
      // eslint-disable-next-line no-loop-func
      while (idList.some((id) => id === caseId)) {
        caseCount++;
        caseId = `Case ${caseCount}`;
      }
      return caseId;
    })
  );

export const useAllGraphParents = (graphId: string): string[] => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (state.graph) return getWorkflowGraphPath(state.graph, graphId);
      else return [];
    })
  );
};

export const useNodeGraphId = (nodeId: string): string => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return state.nodesMetadata[nodeId]?.graphId;
    })
  );
};

// BFS search for nodeId
const getChildrenOfNodeId = (childrenNodes: string[], nodeId: string, rootNode?: WorkflowNode) => {
  if (!rootNode) return undefined;

  const queue = new Queue<WorkflowNode>();
  queue.enqueue(rootNode);

  while (queue.size > 0) {
    const current = queue.dequeue();
    if (current && current.id === nodeId) return getAllChildren(current, childrenNodes);
    if (current?.id === nodeId) {
      return current;
    }

    if (current?.children) {
      for (const child of current.children) {
        queue.enqueue(child);
      }
    }
  }

  return undefined;
};

// Adds all childrenIds
const getAllChildren = (currNode: WorkflowNode, childrenNodes: string[]) => {
  if (currNode.children) {
    for (const child of currNode.children) {
      getAllChildren(child, childrenNodes);
    }
  } else if (currNode.type === WORKFLOW_NODE_TYPES.OPERATION_NODE) {
    childrenNodes.push(currNode.id);
  }
};

// given a nodeId, return all operation nodes within if a scope
export const useGetAllOperationNodesWithin = (nodeId: string) => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      const graphNodes = state.graph;
      const childrenNodes: string[] = [];
      getChildrenOfNodeId(childrenNodes, nodeId, graphNodes ?? undefined);
      return childrenNodes;
    })
  );
};

export const getWorkflowGraphPath = (graph: WorkflowNode, graphId: string) => {
  const traverseGraph = (node: WorkflowNode, path: string[] = []): string[] | undefined => {
    if (node.id === graphId) {
      return path;
    } else {
      let result;
      for (const child of node.children ?? []) {
        const childResult = traverseGraph(child, [...path, node.id]);
        if (childResult) result = childResult;
      }
      return result;
    }
  };

  return [...(traverseGraph(graph) ?? []), graphId];
};

export const useRunInstance = (): LogicAppsV2.RunInstanceDefinition | null => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return state.runInstance;
    })
  );
};

export const useRetryHistory = (id: string): LogicAppsV2.RetryHistory[] | undefined => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return state.runInstance?.properties.actions?.[id]?.retryHistory ?? state.runInstance?.properties.trigger?.retryHistory;
    })
  );
};

export const useRunData = (id: string): LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger | undefined => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return state.nodesMetadata[id]?.runData;
    })
  );
};

export const useNodesMetadata = (): NodesMetadata => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return state.nodesMetadata;
    })
  );
};

export const useParentRunIndex = (id: string | undefined): number | undefined => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (!id) return undefined;
      const parents = getAllParentsForNode(id, state.nodesMetadata).filter((x) =>
        state.operations[x]?.type
          ? state.operations[x].type.toLowerCase() === constants.NODE.TYPE.FOREACH ||
            state.operations[x].type.toLowerCase() === constants.NODE.TYPE.UNTIL
          : false
      );
      return parents.length ? state.nodesMetadata[parents[0]].runIndex : undefined;
    })
  );
};

export const useParentRunId = (id: string | undefined): string | undefined => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (!id) return undefined;
      const parentId = state.nodesMetadata[id]?.parentNodeId;
      if (parentId?.includes('elseActions') || parentId?.includes('actions')) {
        return state.nodesMetadata[parentId]?.parentNodeId;
      }
      return parentId;
    })
  );
};
