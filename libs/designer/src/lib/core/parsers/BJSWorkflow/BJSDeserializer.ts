/* eslint-disable @typescript-eslint/no-unused-vars */
import { isNullOrEmpty } from '@microsoft-logic-apps/utils';
import { getIntl } from '../../../common/i18n/intl';
import { WorkflowNode } from '../models/workflowNode';
import { UnsupportedException, UnsupportedExceptionCode } from '../../../common/exceptions/unsupported';

const hasMultipleTriggers = (definition: LogicAppsV2.WorkflowDefinition): boolean => {
  return definition && definition.triggers ? Object.keys(definition.triggers).length > 1 : false;
};

export const Deserialize = (definition: LogicAppsV2.WorkflowDefinition): Omit<any, 'shouldLayout'> => {
  throwIfMultipleTriggers(definition);

  //process Trigger
  let triggerNode: WorkflowNode | null = null;
  if (definition.triggers && !isNullOrEmpty(definition.triggers)) {
    const [[tID, trigger]] = Object.entries(definition.triggers);
    triggerNode = {
      id: tID,
      type: trigger.type,
      operation: trigger,
      position: { x: 0, y: 0 },
      size: { height: 0, width: 0 },
      parentNodes: [],
      childrenNodes: [],
    };
  }
  const actionsProcessed = ConvertActionsToGraph(definition.actions, 'root');
  return {
    rootGraph: 'root',
    graphs: {
      root: {
        root: triggerNode?.id ?? '',
        nodes: [...actionsProcessed.nodesInGraph, triggerNode?.id ?? ''].filter((x) => x),
      },
    },
    nodes: markChildrenNodes(
      actionsProcessed.nodesInGraph,
      giveNodesTriggerAsParent(
        actionsProcessed.nodesInGraph,
        [...actionsProcessed.allNodes, triggerNode].filter((x) => x !== undefined && x !== null) as WorkflowNode[],
        triggerNode?.id ?? ''
      )
    ),
  };
};

const markChildrenNodes = (nodesInGraph: string[], nodes: WorkflowNode[]) => {
  const nodeMap = nodes.reduce((acc, val) => {
    acc.set(val.id, val);
    return acc;
  }, new Map<string, WorkflowNode>());

  nodesInGraph.forEach((nodeId) => {
    const currentNode = nodeMap.get(nodeId);
    for (const pNodeID of currentNode?.parentNodes ?? []) {
      const pNode = nodeMap.get(pNodeID);
      if (pNode) {
        nodeMap.set(pNodeID, {
          ...pNode,
          childrenNodes: [...pNode.childrenNodes, nodeId],
        });
      }
    }
  });
  const ret = Object.fromEntries(nodeMap);
  return ret;
};

const giveNodesTriggerAsParent = (nodesInGraph: string[], nodes: WorkflowNode[], tiggerId: string) => {
  const nodesInGraphSet = new Set(nodesInGraph);
  return nodes.map((x) => {
    if (!nodesInGraphSet.has(x.id)) return x;
    if (x.parentNodes.length > 0) return x;
    return {
      ...x,
      parentNodes: [tiggerId],
    };
  });
};

const ConvertActionsToGraph = (
  actionList?: LogicAppsV2.Actions,
  graphId = 'root'
): {
  nodesInGraph: string[];
  childGraphs: any;
  allNodes: WorkflowNode[];
} => {
  const childGraphs: any = {};
  const allNodes: WorkflowNode[] = [];
  const nodesInGraph: string[] = [];

  for (const [id, action] of Object.entries(actionList ?? {})) {
    nodesInGraph.push(id);
    const runsAfter = action.runAfter;
    const parents = [];
    for (const [raID, ra] of Object.entries(runsAfter ?? {})) {
      parents.push(raID);
    }
    allNodes.push({
      id,
      type: action.type,
      operation: action,
      position: { x: 0, y: 0 },
      size: { height: 0, width: 0 },
      parentNodes: parents,
      childrenNodes: [],
    });
  }
  return {
    nodesInGraph,
    childGraphs: {},
    allNodes,
  };
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
