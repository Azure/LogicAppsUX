/* eslint-disable @typescript-eslint/no-unused-vars */
import { UnsupportedException, UnsupportedExceptionCode } from '../../../common/exceptions/unsupported';
import type { Operations, NodesMetadata } from '../../state/workflowSlice';
import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from '../models/workflowNode';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { equals, isNullOrEmpty, isNullOrUndefined } from '@microsoft-logic-apps/utils';
import { title } from 'process';

const hasMultipleTriggers = (definition: LogicAppsV2.WorkflowDefinition): boolean => {
  return definition && definition.triggers ? Object.keys(definition.triggers).length > 1 : false;
};

export type DeserializedWorkflow = {
  graph: WorkflowGraph;
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
  const graph: WorkflowGraph = {
    id: 'root',
    children: [...children, ...remainingChildren],
    edges: [...rootEdges, ...edges],
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

const createWorkflowNode = (id: string, type: any): WorkflowNode => {
  return {
    id,
    height: 0,
    width: 0,
    type,
  };
};

const createWorkflowEdge = (source: string, target: string): WorkflowEdge => {
  return {
    id: `${source}-${target}`,
    source,
    target,
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
    const node = isScopeAction(action)
      ? createWorkflowNode(actionName, hidden ? 'hiddenNode' : 'graphNode')
      : createWorkflowNode(actionName, 'testNode');

    allActions[actionName] = { ...action };
    nodesMetadata[actionName] = { graphId };
    if (action.runAfter) {
      for (const [runAfterAction] of Object.entries(action.runAfter)) {
        edges.push(createWorkflowEdge(runAfterAction, actionName));
      }
    }

    if (isScopeAction(action)) {
      const [scopeGraphs, scopeActions, scopeNodesMetadata] = processScopeActions(graphId, actionName, action);
      node.children = [...scopeGraphs];
      allActions = { ...allActions, ...scopeActions };
      nodesMetadata = { ...nodesMetadata, ...scopeNodesMetadata };
    }

    nodes.push(node);
  }
  return [nodes, edges, allActions, nodesMetadata];
};

const processScopeActions = (
  graphId: string,
  actionName: string,
  action: LogicAppsV2.ScopeAction
): [WorkflowGraph[], Operations, NodesMetadata] => {
  // TODO: Create Header Node
  const rootGraph: WorkflowGraph = {
    id: `${actionName}-graphContainer`,
    children: [],
    edges: [],
  };

  const scopeHeaderNode = createWorkflowNode(`${actionName}-scope`, 'scopeHeader');
  const scopeGraphNode = createWorkflowNode(`${actionName}-graph`, 'hiddenNode');
  scopeGraphNode.children = [];

  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};

  const applySubgraphActions = (graphId: string, actions?: LogicAppsV2.Actions, subgraphType?: SubgraphType, subgraphTitle?: string) => {
    const [graph, operations, metadata] = processNestedActions(graphId, actions);

    if (!subgraphType) scopeGraphNode.type = 'hiddenNode';

    scopeGraphNode.children?.push(graph);
    allActions = { ...allActions, ...operations };
    nodesMetadata = { ...nodesMetadata, ...metadata };

    if (subgraphType) {
      const scopeId = `${actionName}-scope`;
      const rootId = subgraphTitle ?? `${actionName}-${subgraphType}`;
      const subgraphHeaderNode = createWorkflowNode(rootId, 'subgraphHeader');

      const isAddCase = subgraphType === 'SWITCH-ADD-CASE';

      // Connect scopeHeader to subgraphHeader
      const scopeChildEdge = createWorkflowEdge(scopeId, rootId);
      scopeChildEdge.type = isAddCase ? 'hiddenEdge' : 'onlyEdge';
      rootGraph.edges.push(scopeChildEdge);
      // Connect subgraphHeader to first child
      if (graph.children?.[0]) {
        rootGraph.edges.push(createWorkflowEdge(rootId, graph.children[0].id));
      }

      graph.children.unshift(subgraphHeaderNode);
      nodesMetadata = { ...nodesMetadata, [rootId]: { graphId, subgraphType } };
    }
  };

  if (isSwitchAction(action)) {
    for (const [caseName, caseAction] of Object.entries(action.cases || {})) {
      applySubgraphActions(`${actionName}-${caseName}Actions`, caseAction.actions, 'SWITCH-CASE', caseName);
    }
    applySubgraphActions(`${actionName}-addCase`, undefined, 'SWITCH-ADD-CASE');
    applySubgraphActions(`${actionName}-defaultActions`, action.default?.actions, 'SWITCH-DEFAULT');
  } else if (isIfAction(action)) {
    applySubgraphActions(`${actionName}-actions`, action.actions, 'CONDITIONAL-TRUE');
    applySubgraphActions(`${actionName}-elseActions`, action.else?.actions, 'CONDITIONAL-FALSE');
  } else {
    applySubgraphActions(`${actionName}-actions`, action.actions);
  }

  if (scopeGraphNode.children.length === 1) {
    // Hide graph container UI
    const scopeChildEdge = createWorkflowEdge(`${actionName}-scope`, scopeGraphNode.children[0].id);
    scopeChildEdge.type = 'hiddenEdge';
    rootGraph.edges.push(scopeChildEdge);
  }

  rootGraph.children = [scopeHeaderNode, scopeGraphNode];

  return [[rootGraph], allActions, nodesMetadata];
};

const processNestedActions = (graphId: string, actions: LogicAppsV2.Actions | undefined): [WorkflowGraph, Operations, NodesMetadata] => {
  const [children, edges, scopeActions, scopeNodesMetadata] = !isNullOrUndefined(actions)
    ? buildGraphFromActions(actions, graphId, true)
    : [[], [], {}, {}];

  return [
    {
      id: graphId,
      children,
      edges,
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
