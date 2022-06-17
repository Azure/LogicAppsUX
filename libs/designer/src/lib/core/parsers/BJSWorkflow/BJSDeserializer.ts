/* eslint-disable @typescript-eslint/no-unused-vars */
import { UnsupportedException, UnsupportedExceptionCode } from '../../../common/exceptions/unsupported';
import type { Operations, NodesMetadata } from '../../state/workflowSlice';
import type { WorkflowEdge, WorkflowEdgeType, WorkflowNode, WorkflowNodeType } from '../models/workflowNode';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { equals, isNullOrEmpty, isNullOrUndefined } from '@microsoft-logic-apps/utils';
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
    triggerNode = createWorkflowNode(tID, 'testNode');
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
      rootEdges.push({
        id: `${triggerNode?.id}-${key}`,
        source: triggerNode?.id ?? '',
        target: key,
      });
    }
  }

  const [remainingChildren, edges, actions, actionNodesMetadata] = !isNullOrUndefined(definition.actions)
    ? buildGraphFromActions(definition.actions, 'root')
    : [[], [], {}];
  allActions = { ...allActions, ...actions };
  nodesMetadata = { ...nodesMetadata, ...actionNodesMetadata };
  const graph: WorkflowNode = {
    id: 'root',
    children: [...children, ...remainingChildren],
    edges: [...rootEdges, ...edges],
    type: 'graphNode',
  };

  return { graph, actionData: allActions, nodesMetadata };
};

const isScopeAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.ScopeAction => {
  const actionType = action.type.toLowerCase();
  return actionType === 'scope' || actionType === 'foreach' || actionType === 'until' || actionType === 'if' || actionType === 'switch';
};

const isIfAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.IfAction => {
  return equals(action.type, 'if');
};

const isSwitchAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.SwitchAction => {
  return equals(action.type, 'switch');
};

// INITIAL NODE SIZE IS SET HERE
const createWorkflowNode = (id: string, type: WorkflowNodeType): WorkflowNode => {
  return {
    id,
    type,
    height: 40,
    width: 200,
  };
};

const createWorkflowEdge = (source: string, target: string, type?: WorkflowEdgeType): WorkflowEdge => {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: type ?? 'buttonEdge',
  };
};

const buildGraphFromActions = (
  actions: Record<string, LogicAppsV2.ActionDefinition>,
  graphId: string,
  hidden?: boolean
): [WorkflowNode[], WorkflowEdge[], Operations, NodesMetadata] => {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};
  for (const [actionName, action] of Object.entries(actions)) {
    const node = isScopeAction(action) ? createWorkflowNode(actionName, 'graphNode') : createWorkflowNode(actionName, 'testNode');

    allActions[actionName] = { ...action };
    nodesMetadata[actionName] = { graphId };
    if (action.runAfter) {
      for (const [runAfterAction] of Object.entries(action.runAfter)) {
        edges.push(createWorkflowEdge(runAfterAction, actionName));
      }
    }

    if (isScopeAction(action)) {
      const [scopeNodes, scopeEdges, scopeActions, scopeNodesMetadata] = processScopeActions(actionName, action);
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
  actionName: string,
  action: LogicAppsV2.ScopeAction
): [WorkflowNode[], WorkflowEdge[], Operations, NodesMetadata] => {
  // const rootGraphId = `${actionName}-graphContainer`;
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const scopeId = `${actionName}-scopeHeader`;
  const scopeHeaderNode = createWorkflowNode(scopeId, 'scopeHeader');
  // const scopeGraphNode = createWorkflowNode(`${actionName}-graph`, 'hiddenNode');
  // scopeGraphNode.children = [];
  nodes.push(scopeHeaderNode);

  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};

  const applyActions = (graphId: string, actions?: LogicAppsV2.Actions) => {
    const [graph, operations, metadata] = processNestedActions(graphId, actions);

    nodes.push(graph);
    edges.push(...(graph?.edges ?? []));
    allActions = { ...allActions, ...operations };
    nodesMetadata = { ...nodesMetadata, ...metadata };

    // Connect scopeHeader to first child
    if (graph.children?.[0]) {
      edges.push(createWorkflowEdge(scopeId, graph.children[0].id));
    }
  };

  const applySubgraphActions = (
    subgraphId: string,
    actions: LogicAppsV2.Actions | undefined,
    subgraphType: SubgraphType,
    subgraphTitle?: string
  ) => {
    const [graph, operations, metadata] = processNestedActions(subgraphId, actions);

    nodes.push(graph);
    allActions = { ...allActions, ...operations };
    nodesMetadata = { ...nodesMetadata, ...metadata };

    const rootId = subgraphTitle ?? `${actionName}-${subgraphType}`;
    const subgraphHeaderNode = createWorkflowNode(rootId, 'subgraphHeader');

    const isAddCase = subgraphType === 'SWITCH-ADD-CASE';

    // Connect scopeHeader to subgraphHeader
    edges.push(createWorkflowEdge(scopeId, subgraphId, 'onlyEdge'));
    // Connect subgraphHeader to first child
    if (graph.children?.[0]) {
      edges.push(createWorkflowEdge(rootId, graph.children[0].id));
    }

    graph.children = [subgraphHeaderNode, ...(graph.children ?? [])];
    nodesMetadata = { ...nodesMetadata, [rootId]: { graphId: subgraphId, subgraphType } };
  };

  if (isSwitchAction(action)) {
    for (const [caseName, caseAction] of Object.entries(action.cases || {})) {
      applySubgraphActions(`${actionName}-${caseName}`, caseAction.actions, 'SWITCH-CASE', caseName);
    }
    applySubgraphActions(`${actionName}-addCase`, undefined, 'SWITCH-ADD-CASE');
    applySubgraphActions(`${actionName}-defaultCase`, action.default?.actions, 'SWITCH-DEFAULT');
  } else if (isIfAction(action)) {
    applySubgraphActions(`${actionName}-actions`, action.actions, 'CONDITIONAL-TRUE');
    applySubgraphActions(`${actionName}-elseActions`, action.else?.actions, 'CONDITIONAL-FALSE');
  } else {
    applyActions(`${actionName}-actions`, action.actions);
  }

  return [nodes, edges, allActions, nodesMetadata];
};

const processNestedActions = (graphId: string, actions: LogicAppsV2.Actions | undefined): [WorkflowNode, Operations, NodesMetadata] => {
  const [children, edges, scopeActions, scopeNodesMetadata] = !isNullOrUndefined(actions)
    ? buildGraphFromActions(actions, graphId, true)
    : [[], [], {}, {}];

  return [
    {
      id: graphId,
      children,
      edges,
      type: 'graphNode',
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
