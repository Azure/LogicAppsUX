/* eslint-disable @typescript-eslint/no-unused-vars */
import { UnsupportedException, UnsupportedExceptionCode } from '../../../common/exceptions/unsupported';
import type { Operations, NodesMetadata } from '../../state/workflowSlice';
import { createWorkflowNode, createWorkflowEdge } from '../../utils/graph';
import type { WorkflowNode, WorkflowEdge } from '../models/workflowNode';
import { WORKFLOW_NODE_TYPES, WORKFLOW_EDGE_TYPES } from '../models/workflowNode';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { SUBGRAPH_TYPES, equals, isNullOrEmpty, isNullOrUndefined } from '@microsoft-logic-apps/utils';
import { title } from 'process';

const hasMultipleTriggers = (definition: LogicAppsV2.WorkflowDefinition): boolean => {
  return definition && definition.triggers ? Object.keys(definition.triggers).length > 1 : false;
};

export type DeserializedWorkflow = {
  graph: WorkflowNode;
  actionData: Operations;
  nodesMetadata: NodesMetadata;
};

export const Deserialize = (definition: LogicAppsV2.WorkflowDefinition): DeserializedWorkflow => {
  throwIfMultipleTriggers(definition);

  //process Trigger
  let triggerNode: WorkflowNode | null = null;
  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};
  if (definition.triggers && !isNullOrEmpty(definition.triggers)) {
    const [[tID, trigger]] = Object.entries(definition.triggers);
    triggerNode = createWorkflowNode(tID);
    allActions[tID] = { ...trigger };
    nodesMetadata[tID] = { graphId: 'root' };
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
  const graph: WorkflowNode = {
    id: 'root',
    children: [...children, ...remainingChildren],
    edges: [...rootEdges, ...edges],
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
  };

  return { graph, actionData: allActions, nodesMetadata };
};

const isScopeAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.ScopeAction => {
  return ['scope', 'foreach', 'until', 'if', 'switch'].includes(action.type.toLowerCase());
};

const isIfAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.IfAction => {
  return equals(action.type, 'if');
};

const isSwitchAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.SwitchAction => {
  return equals(action.type, 'switch');
};

const isUntilAction = (action: LogicAppsV2.ActionDefinition) => action.type.toLowerCase() === 'until';

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
    const node = createWorkflowNode(actionName, isScopeAction(action) ? WORKFLOW_NODE_TYPES.GRAPH_NODE : WORKFLOW_NODE_TYPES.TEST_NODE);

    allActions[actionName] = { ...action };
    nodesMetadata[actionName] = { graphId, parentNodeId };
    if (action.runAfter) {
      for (const [runAfterAction] of Object.entries(action.runAfter)) {
        edges.push(createWorkflowEdge(runAfterAction, actionName));
      }
    }

    if (isScopeAction(action)) {
      const [scopeNodes, scopeEdges, scopeActions, scopeNodesMetadata] = processScopeActions(actionName, actionName, action);
      node.children = scopeNodes;
      node.edges = scopeEdges;
      allActions = { ...allActions, ...scopeActions };
      nodesMetadata = { ...nodesMetadata, ...scopeNodesMetadata };
    }

    nodes.push(node);
  }

  return [nodes, edges, allActions, nodesMetadata];
};

const processScopeActions = (
  // graphId: string,
  parentNodeId: string | undefined,
  actionName: string,
  action: LogicAppsV2.ScopeAction
): [WorkflowNode[], WorkflowEdge[], Operations, NodesMetadata] => {
  // const rootGraphId = `${actionName}-graphContainer`;
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const headerId = `${actionName}-#scope`;
  const scopeCardNode = createWorkflowNode(headerId, WORKFLOW_NODE_TYPES.SCOPE_NODE);
  nodes.push(scopeCardNode);

  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};

  // For use on scope nodes with a single flow
  const applyActions = (graphId: string, actions?: LogicAppsV2.Actions) => {
    const [graph, operations, metadata] = processNestedActions(graphId, parentNodeId, actions);

    nodes.push(...(graph.children as []));
    edges.push(...(graph.edges as []));
    allActions = { ...allActions, ...operations };
    nodesMetadata = { ...nodesMetadata, ...metadata };

    // Connect graph header to first child
    if (graph.children?.[0]) {
      edges.push(createWorkflowEdge(headerId, graph.children[0].id));
    }
  };

  // For use on scope nodes with multiple flows
  const applySubgraphActions = (subgraphId: string, actions: LogicAppsV2.Actions | undefined, subgraphType: SubgraphType) => {
    const [graph, operations, metadata] = processNestedActions(subgraphId, parentNodeId, actions);
    if (!graph?.edges) graph.edges = [];

    nodes.push(graph);
    allActions = { ...allActions, ...operations };
    nodesMetadata = { ...nodesMetadata, ...metadata };

    const rootId = `${subgraphId}-#subgraph`;
    const subgraphCardNode = createWorkflowNode(rootId, WORKFLOW_NODE_TYPES.SUBGRAPH_NODE);

    const isAddCase = subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE;
    if (isAddCase) graph.type = WORKFLOW_NODE_TYPES.HIDDEN_NODE;

    // Connect graph header to subgraph node
    edges.push(createWorkflowEdge(headerId, rootId, isAddCase ? WORKFLOW_EDGE_TYPES.HIDDEN_EDGE : WORKFLOW_EDGE_TYPES.ONLY_EDGE));
    // Connect subgraph node to first child
    if (graph.children?.[0]) {
      graph.edges.push(createWorkflowEdge(rootId, graph.children[0].id));
    }

    graph.children = [subgraphCardNode, ...(graph.children ?? [])];
    nodesMetadata = { ...nodesMetadata, [rootId]: { graphId: rootId, subgraphType } };
  };

  // Do-Until nodes are set up very different from all other scope nodes,
  //   having the main node at the bottom and a subgraph node at the top,
  //   use this instead of complicating the other setup functions
  const applyUntilActions = (graphId: string, actions: LogicAppsV2.Actions | undefined) => {
    scopeCardNode.id = scopeCardNode.id.replace('#scope', '#subgraph');
    scopeCardNode.type = WORKFLOW_NODE_TYPES.SUBGRAPH_NODE;

    const [graph, operations, metadata] = processNestedActions(graphId, parentNodeId, actions);

    nodes.push(...(graph?.children ?? []));
    edges.push(...(graph?.edges ?? []));
    allActions = { ...allActions, ...operations };
    nodesMetadata = {
      ...nodesMetadata,
      ...metadata,
      [scopeCardNode.id]: { graphId: scopeCardNode.id, subgraphType: SUBGRAPH_TYPES.UNTIL_DO },
    };

    // Connect scopeHeader to first child
    if (graph.children?.[0]) {
      edges.push(createWorkflowEdge(scopeCardNode.id, graph.children[0].id));
    }

    const footerId = `${graphId}-#footer`;
    const allEdgeSources = edges.map((edge) => edge.source);
    const leafNodes = nodes.filter((node) => !allEdgeSources.includes(node.id));
    leafNodes.forEach((node) => {
      edges.push(createWorkflowEdge(node.id, footerId, WORKFLOW_EDGE_TYPES.HIDDEN_EDGE));
    });
    nodes.push(createWorkflowNode(footerId, WORKFLOW_NODE_TYPES.SCOPE_NODE));
  };

  if (isSwitchAction(action)) {
    for (const [caseName, caseAction] of Object.entries(action.cases || {})) {
      applySubgraphActions(caseName, caseAction.actions, SUBGRAPH_TYPES.SWITCH_CASE);
    }
    applySubgraphActions(`${actionName}-addCase`, undefined, SUBGRAPH_TYPES.SWITCH_ADD_CASE);
    applySubgraphActions(`${actionName}-defaultCase`, action.default?.actions, SUBGRAPH_TYPES.SWITCH_DEFAULT);
  } else if (isIfAction(action)) {
    applySubgraphActions(`${actionName}-actions`, action.actions, SUBGRAPH_TYPES.CONDITIONAL_TRUE);
    applySubgraphActions(`${actionName}-elseActions`, action.else?.actions, SUBGRAPH_TYPES.CONDITIONAL_FALSE);
  } else if (isUntilAction(action)) {
    applyUntilActions(actionName, action.actions);
  } else {
    applyActions(actionName, action.actions);
  }

  return [nodes, edges, allActions, nodesMetadata];
};

const processNestedActions = (graphId: string, parentNodeId: string | undefined, actions: LogicAppsV2.Actions | undefined): [WorkflowNode, Operations, NodesMetadata] => {
  const [children, edges, scopeActions, scopeNodesMetadata] = !isNullOrUndefined(actions)
    ? buildGraphFromActions(actions, graphId, parentNodeId)
    : [[], [], {}, {}];

  return [
    {
      id: graphId,
      children,
      edges,
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
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
