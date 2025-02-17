import constants from '../../common/constants';
import type { Workflow } from '../../common/models/workflow';
import { getConnectionsApiAndMapping } from '../actions/bjsworkflow/connections';
import { updateWorkflowParameters } from '../actions/bjsworkflow/initialize';
import { initializeOperationMetadata, initializeDynamicDataInNodes } from '../actions/bjsworkflow/operationdeserializer';
import { getConnectionsQuery } from '../queries/connections';
import { initializeConnectionReferences } from '../state/connection/connectionSlice';
import { openModal } from '../state/modal/modalSlice';
import { initializeStaticResultProperties } from '../state/staticresultschema/staticresultsSlice';
import { setCollapsedGraphIds } from '../state/workflow/workflowSlice';
import type { RootState } from '../store';
import { getCustomCodeFilesWithData } from '../utils/parameters/helper';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import type { WorkflowNode } from './models/workflowNode';
import { LOCAL_STORAGE_KEYS, LoggerService, Status, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { batch } from 'react-redux';

interface InitWorkflowPayload {
  deserializedWorkflow: DeserializedWorkflow;
  originalDefinition: LogicAppsV2.WorkflowDefinition;
}

export const initializeGraphState = createAsyncThunk<
  InitWorkflowPayload,
  { workflowDefinition: Workflow; runInstance: LogicAppsV2.RunInstanceDefinition | null | undefined },
  { state: RootState }
>(
  'parser/deserialize',
  async (graphState: { workflowDefinition: Workflow; runInstance: any }, { getState, dispatch }): Promise<InitWorkflowPayload> => {
    const { workflowDefinition, runInstance } = graphState;
    const { workflow, designerOptions } = getState() as RootState;
    const spec = workflow.workflowSpec;

    if (spec === undefined) {
      throw new Error('Trying to import workflow without specifying the workflow type');
    }
    if (spec === 'BJS') {
      const traceId = LoggerService().startTrace({
        name: 'Initialize Graph State',
        action: 'initializeGraphState',
        source: 'ParseReduxAction.ts',
      });

      getConnectionsQuery();

      const { definition, connectionReferences, parameters } = workflowDefinition;
      // Check if there are sequential initialize variable actions
      const hasSequentialVars = detectSequentialInitializeVariables(definition);
      let selectedDefinition = definition;

      if (hasSequentialVars) {
        const savedChoice = localStorage.getItem(LOCAL_STORAGE_KEYS.COMBINE_INITIALIZE_VARIABLES);
        if (savedChoice !== null) {
          const useCombined = JSON.parse(savedChoice);
          if (useCombined) {
            selectedDefinition = combineSequentialInitializeVariables(definition);
          }
        } else {
          const useCombined = await new Promise<boolean>((resolve) => {
            dispatch(openModal({ resolve }));
          });

          if (useCombined) {
            selectedDefinition = combineSequentialInitializeVariables(definition);
          }
        }
      }

      const deserializedWorkflow = BJSDeserialize(selectedDefinition, runInstance);

      // For situations where there is an existing workflow, respect the node dimensions so that they are not reset
      const previousGraphFlattened = flattenWorkflowNodes(workflow.graph?.children || []);
      updateChildrenDimensions(deserializedWorkflow?.graph?.children || [], previousGraphFlattened);

      dispatch(initializeConnectionReferences(connectionReferences ?? {}));
      dispatch(initializeStaticResultProperties(deserializedWorkflow.staticResults ?? {}));
      updateWorkflowParameters(parameters ?? {}, dispatch);

      // If host option has 'collapseGraphsByDefault' set to true, collapse all graphs
      const collapseGraphsByDefaultFlag = designerOptions?.hostOptions?.collapseGraphsByDefault;
      if (collapseGraphsByDefaultFlag) {
        const allGraphIds: string[] = [];
        const collapseGraphs = (graph: WorkflowNode) => {
          if (graph.children && graph.type !== WORKFLOW_NODE_TYPES.HIDDEN_NODE) {
            allGraphIds.push(graph.id);
            graph.children.forEach(collapseGraphs);
          }
        };
        collapseGraphs(deserializedWorkflow.graph);
        dispatch(setCollapsedGraphIds(allGraphIds));
      }

      const { connections, customCode } = getState();
      const customCodeWithData = getCustomCodeFilesWithData(customCode);

      const asyncInitialize = async () => {
        batch(async () => {
          try {
            await Promise.all([
              initializeOperationMetadata(
                deserializedWorkflow,
                connections.connectionReferences,
                parameters ?? {},
                customCodeWithData,
                workflow.workflowKind,
                dispatch
              ),
              getConnectionsApiAndMapping(deserializedWorkflow, dispatch),
            ]);
            await initializeDynamicDataInNodes(getState, dispatch);

            LoggerService().endTrace(traceId, { status: Status.Success });
          } catch (error) {
            LoggerService().endTrace(traceId, { status: Status.Failure, data: error instanceof Error ? error : undefined });
          }
        });
      };
      asyncInitialize();

      return { deserializedWorkflow, originalDefinition: definition };
    }
    if (spec === 'CNCF') {
      throw new Error('Spec not implemented.');
    }
    throw new Error('Invalid Workflow Spec');
  }
);

export function updateChildrenDimensions(currentChildren: WorkflowNode[], previousChildren: WorkflowNode[]) {
  for (const node of currentChildren) {
    const previousNode = previousChildren.find((item) => item.id === node.id);
    if (previousNode?.height && previousNode?.width) {
      node.height = previousNode.height;
      node.width = previousNode.width;
    }
    updateChildrenDimensions(node.children || [], previousChildren);
  }
}

export function flattenWorkflowNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  const result: WorkflowNode[] = [];

  for (const node of nodes) {
    if (node.children) {
      const flattenedChildren = flattenWorkflowNodes(node.children);
      result.push(...flattenedChildren);
    }

    // make a copy of the current node before modifying its children
    const nodeCopy = { ...node };
    nodeCopy.children = undefined;
    result.push(nodeCopy);
  }

  return result;
}

const detectSequentialInitializeVariables = (definition: LogicAppsV2.WorkflowDefinition): boolean => {
  const actions = definition.actions || {};
  let foundSequential = false;

  Object.entries(actions).forEach(([_actionName, action]) => {
    if (action?.type === constants.SERIALIZED_TYPE.INITIALIZE_VARIABLE && action?.runAfter) {
      const runAfterKeys = Object.keys(action.runAfter);
      if (runAfterKeys.length === 1) {
        const prevActionName = runAfterKeys[0];
        const prevAction = actions[prevActionName];
        if (prevAction?.type === constants.SERIALIZED_TYPE.INITIALIZE_VARIABLE) {
          foundSequential = true;
        }
      }
    }
  });

  return foundSequential;
};

const combineSequentialInitializeVariables = (definition: LogicAppsV2.WorkflowDefinition): LogicAppsV2.WorkflowDefinition => {
  if (!definition.actions) {
    return definition;
  }

  const actionsCopy = { ...definition.actions };
  const mergedActions: Record<string, any> = {}; // Store merged actions
  const actionsToRemove = new Set<string>(); // Track actions to delete

  Object.entries(actionsCopy).forEach(([actionName, action]) => {
    if (action?.type !== constants.SERIALIZED_TYPE.INITIALIZE_VARIABLE || !action.runAfter) {
      return;
    }

    const runAfterKeys = Object.keys(action.runAfter);
    if (runAfterKeys.length === 1) {
      const prevActionName = runAfterKeys[0];
      const prevAction = actionsCopy[prevActionName];

      // Ensure the previous action is also InitializeVariable
      if (prevAction?.type === constants.SERIALIZED_TYPE.INITIALIZE_VARIABLE) {
        // Check if any action (other than our chain) depends on prevAction
        const isIntermediateUsed = Object.values(actionsCopy).some(
          (otherAction) => otherAction.runAfter && Object.keys(otherAction.runAfter).includes(prevActionName) && otherAction !== action // Exclude our sequential chain
        );

        if (!isIntermediateUsed) {
          const bottomActionName = actionName;
          const mergedVariables: any[] = [];
          let trackedProperties: Record<string, any> = {};

          // Traverse the sequential initializeVariables and "collect" variables
          let currentAction = action as LogicAppsV2.InitializeVariableAction;
          let currentName = actionName;
          let topMostRunAfter = currentAction.runAfter;

          while (
            currentAction?.type === constants.SERIALIZED_TYPE.INITIALIZE_VARIABLE &&
            currentAction.runAfter &&
            Object.keys(currentAction.runAfter).length === 1 &&
            actionsCopy[Object.keys(currentAction.runAfter)[0]]?.type === constants.SERIALIZED_TYPE.INITIALIZE_VARIABLE
          ) {
            mergedVariables.push(...currentAction.inputs.variables);

            if (currentAction.trackedProperties) {
              trackedProperties = { ...trackedProperties, ...currentAction.trackedProperties };
            }

            actionsToRemove.add(currentName);

            currentName = Object.keys(currentAction.runAfter)[0];
            currentAction = actionsCopy[currentName] as LogicAppsV2.InitializeVariableAction;
            topMostRunAfter = currentAction?.runAfter || {};
          }

          // Push variables from the top-most action (last in loop)
          if (currentAction?.inputs?.variables) {
            mergedVariables.push(...currentAction.inputs.variables);
          }
          actionsToRemove.add(currentName);

          // Store the merged action under the bottom-most action name, so that subsequent runAfters are preserved
          // Eric - I had tried to rename the mergedActionName to something that would combine the names of the actions being merged,
          // but even after updating runAfter references, it was still causing some infinite loop, so I'm just using the bottom-most action name for now
          mergedActions[bottomActionName] = {
            type: constants.SERIALIZED_TYPE.INITIALIZE_VARIABLE,
            inputs: { variables: mergedVariables },
            runAfter: topMostRunAfter,
          };

          // Only add trackedProperties if there are any
          if (Object.keys(trackedProperties).length > 0) {
            mergedActions[bottomActionName].trackedProperties = trackedProperties;
          }
        }
      }
    }
  });

  // Remove the already existing merged variables
  actionsToRemove.forEach((name) => delete actionsCopy[name]);

  // Merge in newly created merged variables
  return { ...definition, actions: { ...actionsCopy, ...mergedActions } };
};
