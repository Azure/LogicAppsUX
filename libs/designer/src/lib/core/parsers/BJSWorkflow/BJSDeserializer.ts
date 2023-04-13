/* eslint-disable @typescript-eslint/no-unused-vars */
import { UnsupportedException, UnsupportedExceptionCode } from '../../../common/exceptions/unsupported';
import type { Operations, NodesMetadata } from '../../state/workflow/workflowInterfaces';
import { createWorkflowNode, createWorkflowEdge } from '../../utils/graph';
import type { WorkflowNode, WorkflowEdge } from '../models/workflowNode';
import { getDurationString, getDurationStringPanelMode } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { SubgraphType } from '@microsoft/utils-logic-apps';
import {
  WORKFLOW_NODE_TYPES,
  WORKFLOW_EDGE_TYPES,
  SUBGRAPH_TYPES,
  equals,
  isNullOrEmpty,
  isNullOrUndefined,
} from '@microsoft/utils-logic-apps';

const hasMultipleTriggers = (definition: LogicAppsV2.WorkflowDefinition): boolean => {
  return definition && definition.triggers ? Object.keys(definition.triggers).length > 1 : false;
};

export type DeserializedWorkflow = {
  graph: WorkflowNode;
  actionData: Operations;
  nodesMetadata: NodesMetadata;
  staticResults?: Record<string, any>;
};

export const Deserialize = (
  definition: LogicAppsV2.WorkflowDefinition,
  runInstance: LogicAppsV2.RunInstanceDefinition | null
): DeserializedWorkflow => {
  throwIfMultipleTriggers(definition);

  //process Trigger
  let triggerNode: WorkflowNode | null = null;
  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};
  if (definition.triggers && !isNullOrEmpty(definition.triggers)) {
    const [[tID, trigger]] = Object.entries(definition.triggers);
    triggerNode = createWorkflowNode(tID);
    allActions[tID] = { ...trigger };
    nodesMetadata[tID] = {
      graphId: 'root',
      isRoot: true,
      ...(trigger?.metadata && { actionMetadata: trigger?.metadata }),
      ...addTriggerInstanceMetaData(runInstance),
    };
  }

  const children = [];
  const rootEdges: WorkflowEdge[] = [];
  if (triggerNode) {
    children.push(triggerNode);
  }

  if (definition.actions) {
    const entries = Object.entries(definition.actions);
    const parentlessChildren = entries.filter(([, value]) => isNullOrEmpty(value.runAfter));
    for (const [key] of parentlessChildren) {
      rootEdges.push(createWorkflowEdge(triggerNode?.id ?? '', key));
    }
  }

  const [remainingChildren, edges, actions, actionNodesMetadata] = !isNullOrUndefined(definition.actions)
    ? buildGraphFromActions(definition.actions, 'root', undefined /* parentNodeId */)
    : [[], [], {}];
  allActions = { ...allActions, ...actions };
  nodesMetadata = { ...nodesMetadata, ...actionNodesMetadata };

  nodesMetadata = addActionsInstanceMetaData(nodesMetadata, runInstance);

  const graph: WorkflowNode = {
    id: 'root',
    children: [...children, ...remainingChildren],
    edges: [...rootEdges, ...edges],
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
  };
  return {
    graph,
    actionData: allActions,
    nodesMetadata,
    ...(Object.keys(definition.staticResults ?? {}).length > 0 ? { staticResults: definition.staticResults } : {}),
  };
};

const isScopeAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.ScopeAction => {
  return ['scope', 'foreach', 'until', 'if', 'switch'].includes(action?.type?.toLowerCase());
};

const isIfAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.IfAction => {
  return equals(action?.type, 'if');
};

const isSwitchAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.SwitchAction => {
  return equals(action?.type, 'switch');
};

const isUntilAction = (action: LogicAppsV2.ActionDefinition) => action?.type?.toLowerCase() === 'until';

const buildGraphFromActions = (
  actions: Record<string, LogicAppsV2.ActionDefinition>,
  graphId: string,
  parentNodeId: string | undefined
): [WorkflowNode[], WorkflowEdge[], Operations, NodesMetadata] => {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};
  for (const [actionName, action] of Object.entries(actions)) {
    const node = createWorkflowNode(
      actionName,
      isScopeAction(action) ? WORKFLOW_NODE_TYPES.GRAPH_NODE : WORKFLOW_NODE_TYPES.OPERATION_NODE
    );

    allActions[actionName] = { ...action };

    const isRoot = Object.keys(action.runAfter ?? {}).length === 0 && parentNodeId;
    nodesMetadata[actionName] = { graphId, ...(parentNodeId ? { parentNodeId: parentNodeId } : {}) };

    if (isScopeAction(action)) {
      const [scopeNodes, scopeEdges, scopeActions, scopeNodesMetadata] = processScopeActions(graphId, actionName, action);
      node.children = scopeNodes;
      node.edges = scopeEdges;
      allActions = { ...allActions, ...scopeActions };
      nodesMetadata = { ...nodesMetadata, ...scopeNodesMetadata };
    }

    // Assign root prop
    nodesMetadata[actionName] = { ...nodesMetadata[actionName], ...(isRoot && { isRoot: true }) };
    if (!isRoot) {
      for (const [runAfterAction] of Object.entries(action.runAfter ?? {})) {
        edges.push(createWorkflowEdge(runAfterAction, actionName));
      }
    }

    // Assign preexisting metadata
    if (action?.metadata) {
      nodesMetadata[actionName] = {
        ...nodesMetadata[actionName],
        actionMetadata: action?.metadata,
      };
    }

    nodes.push(node);
  }
  return [nodes, edges, allActions, nodesMetadata];
};

const processScopeActions = (
  rootGraphId: string,
  actionName: string,
  action: LogicAppsV2.ScopeAction
): [WorkflowNode[], WorkflowEdge[], Operations, NodesMetadata] => {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const headerId = `${actionName}-#scope`;
  const scopeCardNode = createWorkflowNode(headerId, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE);
  nodes.push(scopeCardNode);

  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};

  // For use on scope nodes with a single flow
  const applyActions = (graphId: string, actions?: LogicAppsV2.Actions) => {
    const [graph, operations, metadata] = processNestedActions(graphId, graphId, actions);

    nodes.push(...(graph.children as []));
    edges.push(...(graph.edges as []));
    allActions = { ...allActions, ...operations };
    nodesMetadata = {
      ...nodesMetadata,
      ...metadata,
      [graphId]: {
        graphId: rootGraphId,
        parentNodeId: rootGraphId === 'root' ? undefined : rootGraphId,
        actionCount:
          graph.children?.filter(
            (node) =>
              node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE ||
              node.type === WORKFLOW_NODE_TYPES.GRAPH_NODE ||
              node.type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE
          )?.length ?? 0,
      },
    };

    // Connect graph header to all top level nodes
    for (const child of graph.children ?? []) {
      if (metadata[child.id]?.isRoot) edges.push(createWorkflowEdge(headerId, child.id, WORKFLOW_EDGE_TYPES.HEADING_EDGE));
    }
  };

  // For use on scope nodes with multiple flows
  const applySubgraphActions = (
    graphId: string,
    subgraphId: string,
    actions: LogicAppsV2.Actions | undefined,
    subgraphType: SubgraphType,
    subGraphLocation: string | undefined
  ) => {
    const [graph, operations, metadata] = processNestedActions(subgraphId, graphId, actions, true);
    if (!graph?.edges) graph.edges = [];

    graph.subGraphLocation = subGraphLocation;

    nodes.push(graph);
    allActions = { ...allActions, ...operations };
    nodesMetadata = { ...nodesMetadata, ...metadata };

    const rootId = `${subgraphId}-#subgraph`;
    const subgraphCardNode = createWorkflowNode(rootId, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE);

    const isAddCase = subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE;
    if (isAddCase) graph.type = WORKFLOW_NODE_TYPES.HIDDEN_NODE;

    // Connect graph header to subgraph node
    edges.push(createWorkflowEdge(headerId, subgraphId, isAddCase ? WORKFLOW_EDGE_TYPES.HIDDEN_EDGE : WORKFLOW_EDGE_TYPES.ONLY_EDGE));
    // Connect subgraph node to all top level nodes
    for (const child of graph.children ?? []) {
      if (metadata[child.id]?.isRoot) graph.edges.push(createWorkflowEdge(rootId, child.id, WORKFLOW_EDGE_TYPES.HEADING_EDGE));
    }

    graph.children = [subgraphCardNode, ...(graph.children ?? [])];
    nodesMetadata = {
      ...nodesMetadata,
      [subgraphId]: {
        graphId: graphId,
        parentNodeId: graphId === 'root' ? undefined : graphId,
        subgraphType,
        actionCount: graph.children.filter((node) => !node.id.includes('-#'))?.length ?? -1,
      },
    };
  };

  // Do-Until nodes are set up very different from all other scope nodes,
  //   having the main node at the bottom and a subgraph node at the top,
  //   use this instead of complicating the other setup functions
  const applyUntilActions = (graphId: string, actions: LogicAppsV2.Actions | undefined) => {
    scopeCardNode.id = scopeCardNode.id.replace('#scope', '#subgraph');
    scopeCardNode.type = WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE;

    const [graph, operations, metadata] = processNestedActions(graphId, graphId, actions);

    nodes.push(...(graph?.children ?? []));
    edges.push(...(graph?.edges ?? []));
    allActions = { ...allActions, ...operations };
    nodesMetadata = {
      ...nodesMetadata,
      ...metadata,
      [graphId]: {
        graphId: rootGraphId,
        subgraphType: SUBGRAPH_TYPES.UNTIL_DO,
        parentNodeId: rootGraphId === 'root' ? undefined : rootGraphId,
        actionCount:
          graph.children?.filter(
            (node) =>
              node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE ||
              node.type === WORKFLOW_NODE_TYPES.GRAPH_NODE ||
              node.type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE
          )?.length ?? 0,
      },
    };

    // Connect graph header to all top level nodes
    for (const child of graph.children ?? []) {
      if (metadata[child.id]?.isRoot) edges.push(createWorkflowEdge(scopeCardNode.id, child.id, WORKFLOW_EDGE_TYPES.HEADING_EDGE));
    }

    const footerId = `${graphId}-#footer`;
    const allEdgeSources = edges.map((edge) => edge.source);
    const leafNodes = nodes.filter((node) => !allEdgeSources.includes(node.id));
    leafNodes.forEach((node) => {
      edges.push(createWorkflowEdge(node.id, footerId, WORKFLOW_EDGE_TYPES.HIDDEN_EDGE));
    });
    nodes.push(createWorkflowNode(footerId, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE));
  };

  if (isSwitchAction(action)) {
    for (const [caseName, caseAction] of Object.entries(action.cases || {})) {
      applySubgraphActions(actionName, caseName, caseAction.actions, SUBGRAPH_TYPES.SWITCH_CASE, 'cases');
    }
    applySubgraphActions(actionName, `${actionName}-addCase`, undefined, SUBGRAPH_TYPES.SWITCH_ADD_CASE, undefined /* subGraphLocation */);
    applySubgraphActions(actionName, `${actionName}-defaultCase`, action.default?.actions, SUBGRAPH_TYPES.SWITCH_DEFAULT, 'default');
    nodesMetadata = {
      ...nodesMetadata,
      [actionName]: {
        graphId: rootGraphId,
        actionCount: Object.entries(action.cases || {}).length,
        parentNodeId: rootGraphId === 'root' ? undefined : rootGraphId,
      },
    };
  } else if (isIfAction(action)) {
    applySubgraphActions(actionName, `${actionName}-actions`, action.actions, SUBGRAPH_TYPES.CONDITIONAL_TRUE, 'actions');
    applySubgraphActions(actionName, `${actionName}-elseActions`, action.else?.actions, SUBGRAPH_TYPES.CONDITIONAL_FALSE, 'else');
    nodesMetadata = {
      ...nodesMetadata,
      [actionName]: {
        graphId: rootGraphId,
        actionCount: 2,
        parentNodeId: rootGraphId === 'root' ? undefined : rootGraphId,
      },
    };
  } else if (isUntilAction(action)) {
    applyUntilActions(actionName, action.actions);
  } else {
    applyActions(actionName, action.actions);
  }
  return [nodes, edges, allActions, nodesMetadata];
};

const processNestedActions = (
  graphId: string,
  parentNodeId: string | undefined,
  actions: LogicAppsV2.Actions | undefined,
  isSubgraph?: boolean
): [WorkflowNode, Operations, NodesMetadata] => {
  const [children, edges, scopeActions, scopeNodesMetadata] = !isNullOrUndefined(actions)
    ? buildGraphFromActions(actions, graphId, parentNodeId)
    : [[], [], {}, {}];
  return [
    {
      id: graphId,
      children,
      edges,
      type: isSubgraph ? WORKFLOW_NODE_TYPES.SUBGRAPH_NODE : WORKFLOW_NODE_TYPES.GRAPH_NODE,
    },
    scopeActions,
    scopeNodesMetadata,
  ];
};

const throwIfMultipleTriggers = (definition: LogicAppsV2.WorkflowDefinition) => {
  if (hasMultipleTriggers(definition)) {
    const triggerNames = Object.keys(definition.triggers ?? []);
    const intl = getIntl();
    throw new UnsupportedException(
      intl.formatMessage({
        defaultMessage: 'Cannot render designer due to multiple triggers in definition.',
        description:
          "This is an error message shown when a user tries to load a workflow defintion that contains Multiple entry points which isn't supported",
      }),
      UnsupportedExceptionCode.RENDER_MULTIPLE_TRIGGERS,
      {
        triggerNames,
      }
    );
  }
};

const addTriggerInstanceMetaData = (runInstance: LogicAppsV2.RunInstanceDefinition | null) => {
  if (isNullOrUndefined(runInstance)) {
    return {};
  }

  const { trigger: runInstanceTrigger } = runInstance.properties;
  return {
    runData: {
      ...runInstanceTrigger,
      duration: getDurationStringPanelMode(
        Date.parse(runInstanceTrigger.endTime) - Date.parse(runInstanceTrigger.startTime),
        /* abbreviated */ true
      ),
    },
  };
};

const addActionsInstanceMetaData = (nodesMetadata: NodesMetadata, runInstance: LogicAppsV2.RunInstanceDefinition | null): NodesMetadata => {
  if (isNullOrUndefined(runInstance)) {
    return nodesMetadata;
  }

  const { actions: runInstanceActions } = runInstance.properties;
  const updatedNodesData = { ...nodesMetadata };

  Object.entries(updatedNodesData).forEach(([key, node]) => {
    const nodeRunData = runInstanceActions?.[key];
    if (!isNullOrUndefined(nodeRunData)) {
      updatedNodesData[key] = {
        ...node,
        runData: {
          ...nodeRunData,
          duration: getDurationStringPanelMode(Date.parse(nodeRunData.endTime) - Date.parse(nodeRunData.startTime), /* abbreviated */ true),
        },
        runIndex: 0,
      };
    }
  });

  return updatedNodesData;
};
