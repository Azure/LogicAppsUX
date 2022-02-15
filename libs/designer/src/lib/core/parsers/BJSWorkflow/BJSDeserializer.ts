/* eslint-disable @typescript-eslint/no-unused-vars */
import { isNullOrEmpty, isNullOrUndefined } from '@microsoft-logic-apps/utils';
import { getIntl } from '@microsoft-logic-apps/intl';
import { WorkflowEdge, WorkflowGraph, WorkflowNode } from '../models/workflowNode';
import { UnsupportedException, UnsupportedExceptionCode } from '../../../common/exceptions/unsupported';
import { Actions } from '../../state/workflowSlice';

const hasMultipleTriggers = (definition: LogicAppsV2.WorkflowDefinition): boolean => {
  return definition && definition.triggers ? Object.keys(definition.triggers).length > 1 : false;
};

export const Deserialize = (definition: LogicAppsV2.WorkflowDefinition): { graph: WorkflowGraph; actionData: Actions } => {
  throwIfMultipleTriggers(definition);

  //process Trigger
  let triggerNode: WorkflowNode | null = null;
  let allActions: Actions = {};
  if (definition.triggers && !isNullOrEmpty(definition.triggers)) {
    const [[tID, trigger]] = Object.entries(definition.triggers);
    triggerNode = {
      id: tID,
      height: 0,
      width: 0,
    };
    allActions[tID] = { scope: 'root', ...trigger };
  }

  const children = [];
  const rootEdges = [];
  if (triggerNode) {
    children.push(triggerNode);
  }

  if (definition.actions) {
    const entries = Object.entries(definition.actions);
    const parentlessChildren = entries.filter(([, value]) => isNullOrEmpty(value.runAfter));
    for (const [key] of parentlessChildren) {
      rootEdges.push({
        id: `${triggerNode?.id}-${key}`,
        source: triggerNode?.id,
        target: key,
      });
    }
  }

  const [remainingChildren, edges, actions] = !isNullOrUndefined(definition.actions)
    ? buildGraphFromActions(definition.actions, 'root')
    : [[], [], {}];
  allActions = { ...allActions, ...actions };
  const graph: WorkflowGraph = {
    id: 'root',
    children: [...children, ...remainingChildren],
    edges: [...rootEdges, ...edges],
  };

  return { graph, actionData: allActions };
};

const isScopeAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.ScopeAction => {
  return !isNullOrUndefined((action as any).actions);
};

const isIfAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.IfAction => {
  return isScopeAction(action) && !isNullOrUndefined((action as any).else);
};

const buildGraphFromActions = (actions: Actions, scope: string): [WorkflowNode[], WorkflowEdge[], Actions] => {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let allActions: Actions = {};
  for (const [actionName, action] of Object.entries(actions)) {
    const node: WorkflowNode = {
      id: actionName,
      height: 0,
      width: 0,
    };

    allActions[actionName] = { ...action, scope };
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
      const [children, edges, scopeActions] = !isNullOrUndefined(action.actions)
        ? buildGraphFromActions(action.actions, `${actionName}-actions`)
        : [[], []];
      allActions = { ...allActions, ...scopeActions };
      const actionGraph: WorkflowGraph = {
        id: `${actionName}-actions`,
        children,
        edges,
      };
      node.children = [actionGraph];
    }

    if (isIfAction(action)) {
      const [children, edges, elseActions] = !isNullOrUndefined(action.else?.actions)
        ? buildGraphFromActions(action.else?.actions ?? {}, `${actionName}-elseActions`)
        : [[], [], {}];
      allActions = { ...allActions, ...elseActions };
      const actionGraph: WorkflowGraph = {
        id: `${actionName}-elseActions`,
        children,
        edges,
      };
      node.children = [...(node.children ?? []), actionGraph];
    }

    nodes.push(node);
  }
  return [nodes, edges, allActions];
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
