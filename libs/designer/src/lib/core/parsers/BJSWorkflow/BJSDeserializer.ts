/* eslint-disable @typescript-eslint/no-unused-vars */
import { UnsupportedException, UnsupportedExceptionCode } from '../../../common/exceptions/unsupported';
import type { Operations, NodesMetadata } from '../../state/workflowSlice';
import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from '../models/workflowNode';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { equals, isNullOrEmpty, isNullOrUndefined } from '@microsoft-logic-apps/utils';

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
    triggerNode = {
      id: tID,
      height: 0,
      width: 0,
    };
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

const buildGraphFromActions = (
  actions: Record<string, LogicAppsV2.ActionDefinition>,
  graphId: string
): [WorkflowNode[], WorkflowEdge[], Operations, NodesMetadata] => {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};
  for (const [actionName, action] of Object.entries(actions)) {
    const node: WorkflowNode = {
      id: actionName,
      height: 0,
      width: 0,
    };

    allActions[actionName] = { ...action };
    nodesMetadata[actionName] = { graphId };
    if (action.runAfter) {
      for (const [runAfterAction] of Object.entries(action.runAfter)) {
        edges.push({
          id: `${runAfterAction}-${actionName}`,
          source: runAfterAction,
          target: actionName,
        });
      }
    }

    if (isScopeAction(action)) {
      const [scopeGraphs, scopeActions, scopeNodesMetadata] = processScopeActions(actionName, action);
      node.children = [...scopeGraphs];
      allActions = { ...allActions, ...scopeActions };
      nodesMetadata = { ...nodesMetadata, ...scopeNodesMetadata };
    }

    nodes.push(node);
  }
  return [nodes, edges, allActions, nodesMetadata];
};

const processScopeActions = (actionName: string, action: LogicAppsV2.ScopeAction): [WorkflowGraph[], Operations, NodesMetadata] => {
  const actionGraphs: WorkflowGraph[] = [];
  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};

  const applyActions = (graphId: string, actions: LogicAppsV2.Actions | undefined, subgraphType?: SubgraphType) => {
    const [graph, operations, metadata] = processNestedActions(graphId, actions);

    actionGraphs.push(graph);
    allActions = { ...allActions, ...operations };
    nodesMetadata = { ...nodesMetadata, ...metadata };
    addEmptyPlaceholderNodeIfNeeded(graph, nodesMetadata);

    if (subgraphType) {
      const scopeRootId = `${graphId}-${subgraphType}`;
      const prevRootId = graph.children[0].id;
      graph.children.unshift({
        id: scopeRootId,
        height: 0,
        width: 0,
      } as WorkflowNode);
      graph.edges.push({
        id: `${scopeRootId}-${prevRootId}`,
        source: scopeRootId,
        target: prevRootId,
      });
      nodesMetadata = {
        ...nodesMetadata,
        ...{
          [scopeRootId]: {
            graphId,
            subgraphType,
          },
        },
      };
    }
  };

  if (isSwitchAction(action)) {
    const [defaultGraph, defaultActions, defaultNodesMetadata] = processNestedActions(
      `${actionName}-defaultActions`,
      action.default?.actions
    );
    actionGraphs.push(defaultGraph);
    allActions = { ...defaultActions };
    nodesMetadata = { ...defaultNodesMetadata };

    addEmptyPlaceholderNodeIfNeeded(defaultGraph, nodesMetadata);
    for (const [caseName, caseAction] of Object.entries(action.cases || {})) {
      applyActions(`${actionName}-${caseName}Actions`, caseAction.actions, 'SWITCH-CASE');
    }
  } else if (isIfAction(action)) {
    applyActions(`${actionName}-actions`, action.actions, 'CONDITIONAL-TRUE');
    applyActions(`${actionName}-elseActions`, action.else?.actions, 'CONDITIONAL-FALSE');
  } else {
    applyActions(`${actionName}-actions`, action.actions);
  }

  return [actionGraphs, allActions, nodesMetadata];
};

const processNestedActions = (graphId: string, actions: LogicAppsV2.Actions | undefined): [WorkflowGraph, Operations, NodesMetadata] => {
  const [children, edges, scopeActions, scopeNodesMetadata] = !isNullOrUndefined(actions)
    ? buildGraphFromActions(actions, graphId)
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

const addEmptyPlaceholderNodeIfNeeded = (graph: WorkflowGraph, nodesMetadata: NodesMetadata): void => {
  if (!graph.children.length) {
    const nodeId = `${graph.id}-emptyNode`;
    graph.children.push({
      id: nodeId,
      height: 0,
      width: 0,
    });
    // eslint-disable-next-line no-param-reassign
    nodesMetadata[nodeId] = { graphId: graph.id, isPlaceholderNode: true };
  }
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
