import constants from '../../../common/constants';
import { UnsupportedException, UnsupportedExceptionCode } from '../../../common/exceptions/unsupported';
import type { Workflow } from '../../../common/models/workflow';
import type { OutputMock } from '../../state/unitTest/unitTestInterfaces';
import type { Operations, NodesMetadata } from '../../state/workflow/workflowInterfaces';
import { createWorkflowNode, createWorkflowEdge } from '../../utils/graph';
import { createLiteralValueSegment, isValueSegment } from '../../utils/parameters/segment';
import type { WorkflowNode, WorkflowEdge } from '../models/workflowNode';
import {
  LoggerService,
  Status,
  getIntl,
  containsIdTag,
  WORKFLOW_NODE_TYPES,
  WORKFLOW_EDGE_TYPES,
  SUBGRAPH_TYPES,
  equals,
  isNullOrEmpty,
  isNullOrUndefined,
  getUniqueName,
  getRecordEntry,
  guid,
  ConnectionType,
  isObject,
  ExpressionParser,
  isEmptyString,
} from '@microsoft/logic-apps-shared';
import { getDurationStringPanelMode, ActionResults } from '@microsoft/designer-ui';
import type { Assertion, ExpressionFunction, LogicAppsV2, SubgraphType, UnitTestDefinition } from '@microsoft/logic-apps-shared';
import type { PasteScopeParams } from '../../actions/bjsworkflow/copypaste';

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
  runInstance: LogicAppsV2.RunInstanceDefinition | null,
  isMonitoringView = false
): DeserializedWorkflow => {
  throwIfMultipleTriggers(definition);

  const traceId = LoggerService().startTrace({
    name: 'BJSDeserialize',
    action: 'BJSDeserialize',
    source: 'BJSDeserializer.ts',
  });

  // Process Trigger
  let triggerNode: WorkflowNode | null = null;
  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};
  const allActionNames = getAllActionNames(definition.actions);

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
    allActionNames.push(tID);
  } else {
    // Workflow has no trigger, create a placeholder trigger node to reference during initialization
    const tID = constants.NODE.TYPE.PLACEHOLDER_TRIGGER;
    triggerNode = createWorkflowNode(tID, WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE);
    allActions[tID] = { ...triggerNode };
    nodesMetadata[tID] = {
      graphId: 'root',
      isRoot: true,
    };
    allActionNames.push(tID);
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

  const [remainingChildren, edges, actions, actionNodesMetadata] = isNullOrUndefined(definition.actions)
    ? [[], [], {}]
    : buildGraphFromActions(definition.actions, 'root', undefined /* parentNodeId */, allActionNames, isMonitoringView);
  allActions = { ...allActions, ...actions };
  nodesMetadata = { ...nodesMetadata, ...actionNodesMetadata };
  nodesMetadata = addActionsInstanceMetaData(nodesMetadata, allActions, runInstance);

  const graph: WorkflowNode = {
    id: 'root',
    children: [...children, ...remainingChildren],
    edges: [...rootEdges, ...edges],
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
  };

  LoggerService().endTrace(traceId, { status: Status.Success });

  return {
    graph,
    actionData: allActions,
    nodesMetadata,
    ...(Object.keys(definition.staticResults ?? {}).length > 0 ? { staticResults: definition.staticResults } : {}),
  };
};

/**
 * Parses the mock outputs to a value segment.
 * @param {Record<string,any>} mockOutputs - The mock outputs to be parsed.
 * @returns The parsed value segment.
 */
const parseOutputsToValueSegment = (mockOutputs: Record<string, any>) => {
  const flattenOutputs = flattenObject({ outputs: mockOutputs });
  return Object.keys(flattenOutputs).reduce((acc, key) => {
    const id = guid();
    if (isValueSegment({ id, ...flattenOutputs[key][0] })) {
      return Object.assign({}, acc, {
        [key]: [{ id, ...flattenOutputs[key] }],
      });
    }
    const value =
      isObject(flattenOutputs[key]) || Array.isArray(flattenOutputs[key]) ? JSON.stringify(flattenOutputs[key]) : flattenOutputs[key];
    return Object.assign({}, acc, {
      [key]: [createLiteralValueSegment(value)],
    });
  }, {});
};

/**
 * Flattens a nested object into a single-level object.
 * @param {Record<string, any>} obj - The object to flatten.
 * @param {string} prefix - The prefix to use for the flattened keys.
 * @param {Record<string,any>} result - The resulting flattened object.
 * @returns The flattened object.
 */
const flattenObject = (obj: Record<string, any>, prefix = '', result: Record<string, any> = {}): Record<string, any> => {
  for (const key in obj) {
    if (obj[key]) {
      let newKey = prefix ? `${prefix}.${key}` : key;

      if (isEmptyString(prefix)) {
        newKey = `${key}.$`;
      }

      if (isObject(obj[key]) && obj[key] !== null) {
        flattenObject(obj[key], newKey, result);
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
};

/**
 * Deserializes a unit test definition and a workflow definition into assertions and mock results.
 * @param {UnitTestDefinition | null} unitTestDefinition - The unit test definition to deserialize.
 * @param {Workflow} workflowDefinition - The workflow definition to deserialize.
 * @returns An object containing the assertions and mock results, or null if the unit test definition is null.
 */
export const deserializeUnitTestDefinition = (
  unitTestDefinition: UnitTestDefinition | null,
  workflowDefinition: Workflow
): {
  assertions: Assertion[];
  mockResults: Record<string, OutputMock>;
} | null => {
  const { definition } = workflowDefinition;
  const triggersKeys = Object.keys(definition.triggers ?? {});

  // Build mock output for all actions and triggers
  const mockResults: Record<string, OutputMock> = {};

  // Helper function to add mock result for an action
  const addMockResult = (key: string, action: LogicAppsV2.ActionDefinition) => {
    const type = action?.type?.toLowerCase();
    const supportedAction =
      type === 'http' ||
      type === 'invokefunction' ||
      type === ConnectionType.ServiceProvider ||
      type === ConnectionType.Function ||
      type === ConnectionType.ApiManagement ||
      type === ConnectionType.ApiConnection;

    if (supportedAction) {
      mockResults[key] = {
        actionResult: ActionResults.SUCCESS,
        output: {},
      };
    }
  };

  // Recursively process all actions, including nested ones
  const processActions = (actions: LogicAppsV2.Actions | undefined) => {
    if (!actions) {
      return;
    }
    for (const [key, action] of Object.entries(actions)) {
      addMockResult(key, action);
      if (isScopeAction(action)) {
        if (action.actions) {
          processActions(action.actions);
        }
        if (isIfAction(action) && action.else?.actions) {
          processActions(action.else.actions);
        }
        if (isSwitchAction(action)) {
          if (action.default?.actions) {
            processActions(action.default.actions);
          }
          if (action.cases) {
            for (const caseAction of Object.values(action.cases)) {
              if (caseAction.actions) {
                processActions(caseAction.actions);
              }
            }
          }
        }
      }
    }
  };

  // Process all actions in the workflow
  processActions(definition.actions);

  // Process triggers
  triggersKeys.forEach((key) => {
    mockResults[`&${key}`] = {
      actionResult: ActionResults.SUCCESS,
      output: {},
    };
  });

  if (isNullOrUndefined(unitTestDefinition)) {
    return { assertions: [], mockResults };
  }

  // Deserialize mocks
  const triggerName = triggersKeys[0]; // only 1 trigger

  if (triggerName) {
    const mocksTrigger = unitTestDefinition.triggerMocks[triggerName].outputs ?? {};
    mockResults[`&${triggerName}`] = {
      actionResult: unitTestDefinition.triggerMocks[triggerName].properties?.status ?? ActionResults.SUCCESS,
      output: parseOutputsToValueSegment(mocksTrigger),
      isCompleted: !isNullOrEmpty(mocksTrigger),
    };
  }

  // Recursively process action mocks, including nested ones
  const processActionMocks = (actions: LogicAppsV2.Actions | undefined, mocks: Record<string, any>) => {
    if (!actions || !mocks) {
      return;
    }
    for (const [actionName, action] of Object.entries(actions)) {
      if (mocks[actionName]) {
        const mockOutputs = mocks[actionName].outputs ?? {};
        const type = action?.type?.toLowerCase();
        const supportedAction =
          type === 'http' ||
          type === 'invokefunction' ||
          type === ConnectionType.ServiceProvider ||
          type === ConnectionType.Function ||
          type === ConnectionType.ApiManagement ||
          type === ConnectionType.ApiConnection;

        const actionResult = mocks[actionName].properties?.status;

        if (supportedAction) {
          if (actionResult === ActionResults.SUCCESS || actionResult === ActionResults.FAILED) {
            mockResults[actionName] = {
              actionResult: actionResult,
              output: parseOutputsToValueSegment(mockOutputs),
              isCompleted: !isNullOrEmpty(mockOutputs),
            };
          } else {
            delete mockResults[actionName];
          }
        }
      }

      if (isScopeAction(action)) {
        if (action.actions) {
          processActionMocks(action.actions, mocks[actionName]?.actions ?? {});
        }
        if (isIfAction(action)) {
          if (action.actions) {
            processActionMocks(action.actions, mocks[actionName]?.actions ?? {});
          }
          if (action.else?.actions) {
            processActionMocks(action.else.actions, mocks[actionName]?.else?.actions ?? {});
          }
        }
        if (isSwitchAction(action)) {
          if (action.default?.actions) {
            processActionMocks(action.default.actions, mocks[actionName]?.default?.actions ?? {});
          }
          if (action.cases) {
            for (const [caseName, caseAction] of Object.entries(action.cases)) {
              if (caseAction.actions) {
                processActionMocks(caseAction.actions, mocks[actionName]?.cases?.[caseName]?.actions ?? {});
              }
            }
          }
        }
      }
    }
  };

  // Process all action mocks
  processActionMocks(definition.actions, unitTestDefinition.actionMocks);

  // Deserialize assertions
  const assertions = Object.values(unitTestDefinition.assertions).map((assertion) => {
    const { name, description, assertionString } = assertion;
    try {
      const uncastAssertionString = ExpressionParser.parseTemplateExpression(assertionString) as ExpressionFunction;
      return {
        name,
        description,
        assertionString: uncastAssertionString.expression,
      };
    } catch {
      return { name, description, assertionString: '' };
    }
  });

  return { mockResults, assertions: assertions };
};

const isScopeAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.ScopeAction => {
  return ['scope', 'foreach', 'until', 'if', 'switch', 'agent'].includes(action?.type?.toLowerCase());
};

const isIfAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.IfAction => {
  return equals(action?.type, 'if');
};

const isSwitchAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.SwitchAction => {
  return equals(action?.type, 'switch');
};

const isAgentAction = (action: LogicAppsV2.ActionDefinition): action is LogicAppsV2.AgentAction => {
  return equals(action?.type, 'agent');
};

const isUntilAction = (action: LogicAppsV2.ActionDefinition) => action?.type?.toLowerCase() === 'until';

export const buildGraphFromActions = (
  actions: Record<string, LogicAppsV2.ActionDefinition>,
  graphId: string,
  parentNodeId: string | undefined,
  allActionNames: string[],
  isMonitoringView: boolean,
  pasteScopeParams?: PasteScopeParams
): [WorkflowNode[], WorkflowEdge[], Operations, NodesMetadata] => {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let allActions: Operations = {};
  let nodesMetadata: NodesMetadata = {};
  for (let [actionName, _action] of Object.entries(actions)) {
    if (pasteScopeParams) {
      actionName = pasteScopeParams.renamedNodes[actionName] ?? actionName;
    }
    // Making action extensible
    const action = Object.assign({}, _action);
    const node = createWorkflowNode(
      actionName,
      isScopeAction(action) ? WORKFLOW_NODE_TYPES.GRAPH_NODE : WORKFLOW_NODE_TYPES.OPERATION_NODE
    );

    if (isSwitchAction(action) && action?.cases) {
      const caseKeys = Object.keys(action.cases);
      for (const key of caseKeys) {
        if (!allActionNames.includes(key)) {
          allActionNames.push(key);
          continue;
        }
        const caseAction: any = action.cases?.[key];
        const newCaseId = pasteScopeParams ? (pasteScopeParams.renamedNodes[key] ?? key) : getUniqueName(allActionNames, key).name;
        allActionNames.push(newCaseId);
        if (caseAction) {
          action.cases = {
            ...action.cases,
            [newCaseId]: caseAction,
          };
          delete action.cases[key];
        }
      }
    } else if (isAgentAction(action)) {
      if (action?.tools) {
        const toolKeys = Object.keys(action.tools);
        for (const key of toolKeys) {
          if (!allActionNames.includes(key)) {
            allActionNames.push(key);
            continue;
          }
          const toolAction: any = action.tools?.[key];
          const newToolId = pasteScopeParams ? (pasteScopeParams.renamedNodes[key] ?? key) : getUniqueName(allActionNames, key).name;
          allActionNames.push(newToolId);
          if (toolAction) {
            action.tools = {
              ...action.tools,
              [newToolId]: toolAction,
            };
            delete action.tools[key];
          }
        }

        if (action?.channels) {
          if (action.channels.in) {
            const inputChannelKeys = Object.keys(action.channels.in);
            for (const key of inputChannelKeys) {
              const channelAction = action.channels.in?.[key];
              if (channelAction && channelAction?.trigger) {
                const id = `${actionName}${constants.CHANNELS.INPUT}${channelAction.trigger.type}`;
                allActionNames.push(id);
              }
            }

            const outputChannelKeys = Object.keys(action.channels.out);
            for (const key of outputChannelKeys) {
              const channelAction = action.channels.out?.[key];
              if (channelAction && channelAction?.trigger) {
                const id = `${actionName}${constants.CHANNELS.OUTPUT}${channelAction.trigger.type}`;
                allActionNames.push(id);
              }
            }
          }
        }
      }
    }

    allActions[actionName] = { ...action };

    const isRoot = Object.keys(action.runAfter ?? {}).length === 0 && parentNodeId;
    nodesMetadata[actionName] = {
      graphId,
      ...(parentNodeId ? { parentNodeId: parentNodeId } : {}),
    };
    if (isScopeAction(action)) {
      const [scopeNodes, scopeEdges, scopeActions, scopeNodesMetadata] = processScopeActions(
        graphId,
        actionName,
        action,
        allActionNames,
        isMonitoringView,
        pasteScopeParams
      );
      node.children = scopeNodes;
      node.edges = scopeEdges;
      allActions = { ...allActions, ...scopeActions };
      nodesMetadata = { ...nodesMetadata, ...scopeNodesMetadata };
    }

    // Assign root prop
    nodesMetadata[actionName] = {
      ...nodesMetadata[actionName],
      ...(isRoot && { isRoot: true }),
    };
    if (!isRoot) {
      for (let [runAfterAction, runAfterValue] of Object.entries(action.runAfter ?? {})) {
        // update the run after with the updated ids
        if (pasteScopeParams && action.runAfter) {
          // delete existing runAfter action first
          delete action.runAfter[runAfterAction];
          // get the new id from the renamed nodes
          runAfterAction = pasteScopeParams.renamedNodes[runAfterAction] ?? runAfterAction;
          // add the new id to the runAfter object
          action.runAfter[runAfterAction] = runAfterValue;
        }
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

export const processScopeActions = (
  rootGraphId: string,
  actionName: string,
  action: LogicAppsV2.ScopeAction,
  allActionNames: string[],
  isMonitoringView: boolean,
  pasteScopeParams?: PasteScopeParams
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
    const [graph, operations, metadata] = processNestedActions(
      graphId,
      graphId,
      actions,
      allActionNames,
      undefined,
      false,
      pasteScopeParams
    );

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
      if (getRecordEntry(metadata, child.id)?.isRoot) {
        edges.push(createWorkflowEdge(headerId, child.id, WORKFLOW_EDGE_TYPES.HEADING_EDGE));
      }
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
    const [graph, operations, metadata] = processNestedActions(subgraphId, graphId, actions, allActionNames, true, false, pasteScopeParams);
    if (!graph?.edges) {
      graph.edges = [];
    }

    graph.subGraphLocation = subGraphLocation;

    nodes.push(graph);
    allActions = { ...allActions, ...operations };
    nodesMetadata = { ...nodesMetadata, ...metadata };

    const rootId = `${subgraphId}-#subgraph`;
    const subgraphCardNode = createWorkflowNode(rootId, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE);

    const isAddCase = subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE || subgraphType === SUBGRAPH_TYPES.AGENT_ADD_CONDITON;
    if (isAddCase) {
      graph.type = WORKFLOW_NODE_TYPES.HIDDEN_NODE;
    }

    // Connect graph header to subgraph node
    edges.push(createWorkflowEdge(headerId, subgraphId, isAddCase ? WORKFLOW_EDGE_TYPES.HIDDEN_EDGE : WORKFLOW_EDGE_TYPES.ONLY_EDGE));
    // Connect subgraph node to all top level nodes
    for (const child of graph.children ?? []) {
      if (getRecordEntry(metadata, child.id)?.isRoot) {
        graph.edges.push(createWorkflowEdge(rootId, child.id, WORKFLOW_EDGE_TYPES.HEADING_EDGE));
      }
    }

    graph.children = [subgraphCardNode, ...(graph.children ?? [])];
    nodesMetadata = {
      ...nodesMetadata,
      [subgraphId]: {
        graphId: graphId,
        parentNodeId: graphId === 'root' ? undefined : graphId,
        subgraphType,
        actionCount: graph.children.filter((node) => !containsIdTag(node.id))?.length ?? -1,
      },
    };
  };

  // Do-Until nodes are set up very different from all other scope nodes,
  //   having the main node at the bottom and a subgraph node at the top,
  //   use this instead of complicating the other setup functions
  const applyUntilActions = (graphId: string, actions: LogicAppsV2.Actions | undefined) => {
    scopeCardNode.id = scopeCardNode.id.replace('#scope', '#subgraph');
    scopeCardNode.type = WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE;

    const [graph, operations, metadata] = processNestedActions(
      graphId,
      graphId,
      actions,
      allActionNames,
      undefined,
      false,
      pasteScopeParams
    );

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
      if (getRecordEntry(metadata, child.id)?.isRoot) {
        edges.push(createWorkflowEdge(scopeCardNode.id, child.id, WORKFLOW_EDGE_TYPES.HEADING_EDGE));
      }
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
    if (!isMonitoringView) {
      applySubgraphActions(
        actionName,
        `${actionName}-addCase`,
        undefined,
        SUBGRAPH_TYPES.SWITCH_ADD_CASE,
        undefined /* subGraphLocation */
      );
    }
    applySubgraphActions(actionName, `${actionName}-defaultCase`, action.default?.actions, SUBGRAPH_TYPES.SWITCH_DEFAULT, 'default');
    nodesMetadata = {
      ...nodesMetadata,
      [actionName]: {
        graphId: rootGraphId,
        actionCount: Object.entries(action.cases || {}).length,
        parentNodeId: rootGraphId === 'root' ? undefined : rootGraphId,
      },
    };
  } else if (isAgentAction(action)) {
    for (const [toolName, toolAction] of Object.entries(action.tools || {})) {
      applySubgraphActions(actionName, toolName, toolAction.actions, SUBGRAPH_TYPES.AGENT_CONDITION, 'tools');
    }
    if (!isMonitoringView) {
      applySubgraphActions(
        actionName,
        `${actionName}-addCase`,
        undefined,
        SUBGRAPH_TYPES.AGENT_ADD_CONDITON,
        undefined /* subGraphLocation */
      );
    }

    // Add actions for channels
    if (action.channels) {
      if (action.channels.in) {
        const inputChannelKeys = Object.keys(action.channels.in);
        for (const key of inputChannelKeys) {
          const channelAction: any = action.channels.in?.[key];
          if (channelAction && channelAction?.trigger) {
            const id = `${actionName}${constants.CHANNELS.INPUT}${channelAction.trigger.type}`;
            allActions[id] = channelAction.trigger;
          }
        }

        const outputChannelKeys = Object.keys(action.channels.out);
        for (const key of outputChannelKeys) {
          const channelAction: any = action.channels.out?.[key];
          if (channelAction && channelAction?.trigger) {
            const id = `${actionName}${constants.CHANNELS.OUTPUT}${channelAction.trigger.type}`;
            allActions[id] = channelAction.trigger;
          }
        }
      }
    }

    nodesMetadata = {
      ...nodesMetadata,
      [actionName]: {
        graphId: rootGraphId,
        actionCount: Object.entries(action.tools || {}).length,
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
  allActionNames: string[],
  isSubgraph?: boolean,
  isMonitoringView = false,
  pasteScopeParams?: PasteScopeParams
): [WorkflowNode, Operations, NodesMetadata] => {
  const [children, edges, scopeActions, scopeNodesMetadata] = isNullOrUndefined(actions)
    ? [[], [], {}, {}]
    : buildGraphFromActions(actions, graphId, parentNodeId, allActionNames, isMonitoringView, pasteScopeParams);
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
        id: '8L+oIz',
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

const addActionsInstanceMetaData = (
  nodesMetadata: NodesMetadata,
  allActions: Operations,
  runInstance: LogicAppsV2.RunInstanceDefinition | null
): NodesMetadata => {
  if (isNullOrUndefined(runInstance)) {
    return nodesMetadata;
  }

  const { actions: runInstanceActions } = runInstance.properties;
  const updatedNodesData = { ...nodesMetadata };

  Object.entries(updatedNodesData).forEach(([key, node]) => {
    const nodeRunData = runInstanceActions?.[key];
    const isAgent = allActions[key]?.type.toLowerCase() === constants.NODE.TYPE.AGENT;
    const runIndex = isAgent ? (nodeRunData?.iterationCount ? nodeRunData.iterationCount - 1 : 0) : 0;

    if (!isNullOrUndefined(nodeRunData)) {
      const repetitionRunData = isNullOrUndefined(nodeRunData.repetitionCount)
        ? {
            runData: {
              ...nodeRunData,
              duration: getDurationStringPanelMode(
                Date.parse(nodeRunData.endTime) - Date.parse(nodeRunData.startTime),
                /* abbreviated */ true
              ),
            },
          }
        : {};

      updatedNodesData[key] = {
        ...node,
        ...repetitionRunData,
        runIndex,
      };
    }
  });

  return updatedNodesData;
};

export const getAllActionNames = (actions: LogicAppsV2.Actions | undefined, names: string[] = [], includeCase?: boolean): string[] => {
  if (isNullOrUndefined(actions)) {
    return [];
  }

  for (const [actionName, action] of Object.entries(actions)) {
    names.push(actionName);
    if (isScopeAction(action)) {
      if (action.actions) {
        names.push(...getAllActionNames(action.actions, [], includeCase));
      }
      if (isIfAction(action)) {
        if (action.else?.actions) {
          names.push(...getAllActionNames(action.else.actions, [], includeCase));
        }
      }
      if (isSwitchAction(action)) {
        if (action.default?.actions) {
          names.push(...getAllActionNames(action.default.actions, [], includeCase));
        }
        if (action.cases) {
          for (const [caseName, caseAction] of Object.entries(action.cases)) {
            if (includeCase) {
              names.push(caseName);
            }
            if (caseAction.actions) {
              names.push(...getAllActionNames(caseAction.actions, [], includeCase));
            }
          }
        }
      }
      if (isAgentAction(action)) {
        if (action.tools) {
          for (const [toolName, toolAction] of Object.entries(action.tools)) {
            if (includeCase) {
              names.push(toolName);
            }
            if (toolAction.actions) {
              names.push(...getAllActionNames(toolAction.actions, [], includeCase));
            }
          }
        }
      }
    }
  }
  return names;
};
