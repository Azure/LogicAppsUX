import constants from '../../../common/constants';
import type { WorkflowEdge, WorkflowNode } from '../../parsers/models/workflowNode';
import type { RootState } from '../../store';
import { createWorkflowEdge, getAllParentsForNode } from '../../utils/graph';
import type { NodesMetadata, WorkflowState } from './workflowInterfaces';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { labelCase, WORKFLOW_NODE_TYPES, WORKFLOW_EDGE_TYPES, getRecordEntry, SUBGRAPH_TYPES, equals } from '@microsoft/logic-apps-shared';
import { createSelector } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import Queue from 'yocto-queue';
import type {} from 'reselect';
import type {} from '@tanstack/react-query';
import { collapseFlowTree } from './helper';

export const getWorkflowState = (state: RootState): WorkflowState => state.workflow;

export const useNodeDisplayName = (id?: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => labelCase(getRecordEntry(state.idReplacements, id) ?? id ?? '')));

export const useNodeReplacedId = (id?: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => getRecordEntry(state.idReplacements, id)));

export const useReplacedIds = () => useSelector(createSelector(getWorkflowState, (state: WorkflowState) => state.idReplacements));

export const useNodeMetadata = (id?: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => getRecordEntry(state.nodesMetadata, id)));

export const useActionMetadata = (id?: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => getRecordEntry(state.operations, id)));

export const useNodeDescription = (id: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => getRecordEntry(state.operations, id)?.description));

export const useShouldNodeFocus = (id: string) =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => state.focusedCanvasNodeId === id));

export const useIsWorkflowDirty = () => useSelector(createSelector(getWorkflowState, (state: WorkflowState) => state.isDirty));

export const getRootWorkflowGraphForLayout = createSelector(getWorkflowState, (data) => {
  const rootNode = data.graph;
  const collapsedIds = data.collapsedGraphIds;
  const collapsedActionsIds = data.collapsedActionIds;
  if (!rootNode) {
    return undefined;
  }

  if (Object.keys(collapsedIds).length === 0 && Object.keys(collapsedActionsIds).length === 0) {
    return rootNode;
  }

  let newGraph = rootNode;

  if (Object.keys(collapsedActionsIds).length !== 0) {
    newGraph = collapseFlowTree(newGraph, collapsedActionsIds).graph;
  }

  if (Object.keys(collapsedIds).length !== 0) {
    newGraph = {
      ...newGraph,
      children: reduceCollapsed((node: WorkflowNode) => getRecordEntry(collapsedIds, node.id))(newGraph.children ?? []),
    };
  }

  return newGraph;
});

export const useCollapsedMapping = () =>
  useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      const rootNode = state.graph;
      const collapsedActionsIds = state.collapsedActionIds;
      if (!rootNode) {
        return {};
      }

      return collapseFlowTree(rootNode, collapsedActionsIds).collapsedMapping;
    })
  );

const nonfilteredNodeTypes = [WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE];
const filterOutGraphChildren = (children: WorkflowNode[]) => children?.filter((child) => nonfilteredNodeTypes.includes(child.type));
const reduceCollapsed =
  (condition: (arg0: WorkflowNode) => any) =>
  (nodes: WorkflowNode[]): any => {
    return nodes.reduce((acc: any, child: WorkflowNode) => {
      const shouldFilter = condition(child);
      if (!shouldFilter) {
        const reducedChildren = child.children ? { children: reduceCollapsed(condition)(child.children) } : {};
        acc.push({ ...child, ...reducedChildren });
        return acc;
      }

      const filteredChildren = filterOutGraphChildren(child.children ?? []);
      const filteredEdges =
        filteredChildren.length === 2
          ? [createWorkflowEdge(filteredChildren[0]?.id, filteredChildren[1]?.id, WORKFLOW_EDGE_TYPES.HIDDEN_EDGE)]
          : [];
      acc.push({ ...child, ...{ children: filteredChildren, edges: filteredEdges } });
      return acc;
    }, []);
  };

export const useIsGraphCollapsed = (graphId: string): boolean =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState): boolean => state.collapsedGraphIds?.[graphId]));

export const useIsActionCollapsed = (actionId: string): boolean =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState): boolean => state.collapsedActionIds?.[actionId]));

export const useGetSwitchOrAgentParentId = (nodeId: string): { parentId?: string; type?: string } | undefined => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      const nodeMetadata = state.nodesMetadata[nodeId];
      const subgraphType = nodeMetadata?.subgraphType;

      if (subgraphType === SUBGRAPH_TYPES.SWITCH_CASE || subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION) {
        return { parentId: nodeMetadata?.parentNodeId, type: subgraphType };
      }

      return undefined;
    })
  );
};

export const useEdgesBySource = (parentId?: string): WorkflowEdge[] =>
  useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (!parentId || !state.graph) {
        return [];
      }

      const reduceGraph = (graph: WorkflowNode, arr: WorkflowEdge[] = []): WorkflowEdge[] => {
        if (!graph.edges) {
          return arr;
        }
        const edges = graph.edges.filter((x) => x.source === parentId);
        const childEdges = graph.children?.reduce((acc, child) => reduceGraph(child, acc), edges) ?? [];
        return [...arr, ...childEdges];
      };
      return reduceGraph(state.graph);
    })
  );

export const getWorkflowNodeFromGraphState = (state: WorkflowState, actionId: string) => {
  const graph = state.graph;
  if (!graph) {
    return undefined;
  }

  const traverseGraph = (node: WorkflowNode): WorkflowNode | undefined => {
    if (node.id === actionId) {
      return node;
    }

    let result: WorkflowNode | undefined;
    for (const child of node.children ?? []) {
      const childRes = traverseGraph(child);
      if (childRes) {
        result = childRes;
      }
    }
    return result;
  };

  return traverseGraph(graph);
};

export const useNodeEdgeTargets = (nodeId?: string): string[] => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => getRecordEntry(state.edgeIdsBySource ?? {}, nodeId ?? '') ?? [])
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

export const useIsLeafNode = (nodeId: string): boolean => {
  const targets = useNodeEdgeTargets(nodeId);
  return useMemo(() => targets.length === 0, [targets.length]);
};

export const useNodeIds = () => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return Object.keys(state.nodesMetadata);
    })
  );
};

export const useNewAdditiveSubgraphId = (baseId: string) =>
  useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      let caseId = baseId;
      let caseCount = 1;
      const idList = Object.keys(state.nodesMetadata);
      // eslint-disable-next-line no-loop-func
      while (idList.some((id) => id === caseId)) {
        caseCount++;
        caseId = `${baseId}_${caseCount}`;
      }
      return caseId;
    })
  );

export const useAllGraphParents = (graphId: string): string[] => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (state.graph) {
        return getWorkflowGraphPath(state.graph, graphId);
      }
      return [];
    })
  );
};

export const getParentsUncollapseFromGraphState = (state: WorkflowState, actionId: string): Record<string, boolean> => {
  const collapsedGraphIds = state.collapsedGraphIds;
  if (state.graph) {
    const nodeParents = getWorkflowGraphPath(state.graph, actionId);
    nodeParents.forEach((nodeId) => {
      if (nodeId !== actionId && collapsedGraphIds[nodeId]) {
        collapsedGraphIds[nodeId] = false;
      }
    });
  }
  return collapsedGraphIds;
};

export const useNodeGraphId = (nodeId: string): string =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => getRecordEntry(state.nodesMetadata, nodeId)?.graphId ?? ''));

// BFS search for nodeId
const getChildrenOfNodeId = (childrenNodes: string[], nodeId: string, rootNode?: WorkflowNode) => {
  if (!rootNode) {
    return undefined;
  }

  const queue = new Queue<WorkflowNode>();
  queue.enqueue(rootNode);

  while (queue.size > 0) {
    const current = queue.dequeue();
    if (current && current.id === nodeId) {
      return getAllChildren(current, childrenNodes);
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
  const graphNodes = useSelector(createSelector(getWorkflowState, (workflow) => workflow.graph));
  return useMemo(() => {
    const childrenNodes: string[] = [];
    getChildrenOfNodeId(childrenNodes, nodeId, graphNodes ?? undefined);
    return childrenNodes;
  }, [graphNodes, nodeId]);
};

export const getWorkflowGraphPath = (graph: WorkflowNode, graphId: string) => {
  const traverseGraph = (node: WorkflowNode, path: string[] = []): string[] | undefined => {
    if (node.id === graphId) {
      return path;
    }
    let result: string[] | undefined;
    for (const child of node.children ?? []) {
      const childResult = traverseGraph(child, [...path, node.id]);
      if (childResult) {
        result = childResult;
      }
    }
    return result;
  };

  return [...(traverseGraph(graph) ?? []), graphId];
};

export const useRunInstance = (): LogicAppsV2.RunInstanceDefinition | null =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => state.runInstance));

export const useRetryHistory = (id: string): LogicAppsV2.RetryHistory[] | undefined =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => getRecordEntry(state.nodesMetadata, id)?.runData?.retryHistory));

export const useRunData = (id: string): LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger | undefined =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => getRecordEntry(state.nodesMetadata, id)?.runData));

export const useSubgraphRunData = (id: string): Record<string, { actionResults: LogicAppsV2.WorkflowRunAction[] }> | undefined =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => getRecordEntry(state.nodesMetadata, id)?.subgraphRunData));

export const useNodesMetadata = (): NodesMetadata =>
  useSelector(createSelector(getWorkflowState, (state: WorkflowState) => state.nodesMetadata));

export const useParentRunIndex = (id: string | undefined): number | undefined => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (!id) {
        return undefined;
      }
      const allParents = getAllParentsForNode(id, state.nodesMetadata);
      const parents = allParents.filter((x) => {
        const operationType = getRecordEntry(state.operations, x)?.type?.toLowerCase() ?? '';
        return [constants.NODE.TYPE.FOREACH, constants.NODE.TYPE.UNTIL, constants.NODE.TYPE.AGENT].includes(operationType);
      });
      return parents.length ? getRecordEntry(state.nodesMetadata, parents[0])?.runIndex : undefined;
    })
  );
};
export const useRunIndex = (id: string | undefined): number | undefined => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (!id) {
        return undefined;
      }
      return getRecordEntry(state.nodesMetadata, id)?.runIndex;
    })
  );
};

export const useParentNodeId = (id: string | undefined): string | undefined => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      if (!id) {
        return undefined;
      }
      const parentId = getRecordEntry(state.nodesMetadata, id)?.parentNodeId;
      if (parentId?.includes('elseActions') || parentId?.includes('actions')) {
        return getRecordEntry(state.nodesMetadata, parentId)?.parentNodeId;
      }
      return parentId;
    })
  );
};

export const useRootTriggerId = (): string =>
  useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      for (const [id, node] of Object.entries(state.nodesMetadata)) {
        if (node.graphId === 'root' && node.isRoot === true) {
          return id;
        }
      }
      return '';
    })
  );

export const useIsWithinAgenticLoop = (id: string): boolean => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      let currentId = id;

      while (currentId) {
        const type = getRecordEntry(state.operations, currentId)?.type;
        if (equals(type, constants.NODE.TYPE.AGENT)) {
          return true;
        }
        const parentId = getRecordEntry(state.nodesMetadata, currentId)?.parentNodeId;

        if (!parentId) {
          return false;
        }

        currentId = parentId;
      }

      return false;
    })
  );
};

export const useAgentOpertations = () => {
  return useSelector(
    createSelector(getWorkflowState, (state: WorkflowState) => {
      return Object.entries(state.operations).reduce((acc: string[], [id, node]) => {
        if (equals(node.type, constants.NODE.TYPE.AGENT)) {
          acc.push(id);
        }
        return acc;
      }, []);
    })
  );
};

export const getAgentFromCondition = (state: WorkflowState, nodeId: string): string | undefined => {
  if (!nodeId || state.nodesMetadata[nodeId].subgraphType !== SUBGRAPH_TYPES.AGENT_CONDITION) {
    return undefined;
  }

  return state.nodesMetadata[nodeId].parentNodeId;
};
