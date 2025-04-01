import type { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type {
  IConnectionService,
  ILoggerService,
  IOperationManifestService,
  ITemplateResourceService,
  IResourceService,
  Template,
  LogicAppsV2,
  IWorkflowService,
} from '@microsoft/logic-apps-shared';
import {
  clone,
  DevLogger,
  getResourceNameFromId,
  InitConnectionService,
  InitLoggerService,
  InitOperationManifestService,
  InitResourceService,
  InitTemplateResourceService,
  InitWorkflowService,
  LogEntryLevel,
  LoggerService,
} from '@microsoft/logic-apps-shared';
import type { RootState } from '../../state/templates/store';
import {
  getConnectionsInWorkflowApp,
  getConsumptionWorkflow,
  getParametersInWorkflowApp,
  getStandardWorkflow,
  getTemplate,
  getTemplateManifest,
  getWorkflowsInTemplate,
} from '../../configuretemplate/utils/queries';
import { getReactQueryClient } from '../../ReactQueryProvider';
import {
  delimiter,
  getConnectionMappingInDefinition,
  getLogicAppId,
  getOperationDataInDefinitions,
  getParameterReferencesFromValue,
  getTemplateConnectionsFromConnectionsData,
} from '../../configuretemplate/utils/helper';
import { updateAllWorkflowsData } from '../../state/templates/templateSlice';
import { loadTemplate, type WorkflowTemplateData } from './templates';
import { initializeNodeOperationInputsData } from '../../state/operation/operationMetadataSlice';
import type { WorkflowParameter } from '../../../common/models/workflow';
import { getAllInputParameters } from '../../utils/parameters/helper';
import { shouldAddDynamicData } from '../../templates/utils/parametershelper';
import type { WorkflowState } from 'lib/core/state/templates/workflowSlice';

export interface ConfigureTemplateServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  loggerService?: ILoggerService;
  resourceService: IResourceService;
  templateResourceService: ITemplateResourceService;
  workflowService: IWorkflowService;
}

export const initializeConfigureTemplateServices = createAsyncThunk(
  'initializeConfigureTemplateServices',
  async ({
    connectionService,
    operationManifestService,
    resourceService,
    templateResourceService,
    loggerService,
    workflowService,
  }: ConfigureTemplateServiceOptions) => {
    InitConnectionService(connectionService);
    InitOperationManifestService(operationManifestService);
    InitResourceService(resourceService);
    InitTemplateResourceService(templateResourceService);

    const loggerServices: ILoggerService[] = [];
    if (loggerService) {
      loggerServices.push(loggerService);
    }
    if (process.env.NODE_ENV !== 'production') {
      loggerServices.push(new DevLogger());
    }
    InitLoggerService(loggerServices);

    InitWorkflowService(workflowService);
    return true;
  }
);

export const loadCustomTemplate = createAsyncThunk(
  'loadCustomTemplate',
  async ({ templateId }: { templateId: string }, { dispatch }): Promise<{ isPublished: boolean; environment: string }> => {
    const templateName = getResourceNameFromId(templateId);
    const templateResource = await getTemplate(templateId);
    const manifest = await getTemplateManifest(templateId);
    dispatch(loadTemplate({ templateName, preLoadedManifest: manifest }));

    const allWorkflowsManifest = await getWorkflowsInTemplate(templateId);
    const allWorkflowsData = Object.keys(allWorkflowsManifest).reduce(
      (result: Record<string, Partial<WorkflowTemplateData>>, workflowId) => {
        const workflowManifest = allWorkflowsManifest[workflowId];
        const workflowName = getResourceNameFromId(workflowId);
        result[workflowId.toLowerCase()] = {
          id: workflowId,
          workflowName,
          manifest: workflowManifest,
          connectionKeys: [],
          errors: { workflow: undefined },
        };
        return result;
      },
      {}
    );
    dispatch(updateAllWorkflowsData(allWorkflowsData));

    return {
      isPublished: templateResource.properties?.provisioningState === 'Succeeded',
      environment: templateResource.properties?.environment ?? 'Development',
    };
  }
);

export const initializeWorkflowsData = createAsyncThunk(
  'initializeWorkflowsData',
  async (
    { workflows }: { workflows: Record<string, Partial<WorkflowTemplateData>> },
    { getState, dispatch }
  ): Promise<{
    connections: Record<string, Template.Connection>;
    parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>;
  }> => {
    const { connections, mapping, workflowsWithDefinitions } = await getTemplateConnections(getState() as RootState, dispatch, workflows);
    const operationsData = await getOperationDataInDefinitions(
      workflowsWithDefinitions as Record<string, WorkflowTemplateData>,
      connections
    );
    dispatch(initializeNodeOperationInputsData(operationsData));

    const parameterDefinitions = await getTemplateParameters(getState() as RootState, mapping);
    return { connections, parameterDefinitions };
  }
);

export const deleteWorkflowData = createAsyncThunk(
  'deleteWorkflowData',
  async (
    { ids }: { ids: string[] },
    { getState }
  ): Promise<{
    ids: string[];
    connectionKeys: string[];
    parameterKeys: string[];
    parametersToUpdate: Record<string, Partial<Template.ParameterDefinition>>;
  }> => {
    const combinedConnectionKeys: string[] = [];
    const combinedParameterKeys: string[] = [];
    const parametersToUpdate: Record<string, Partial<Template.ParameterDefinition>> = {};

    const {
      template: { workflows, parameterDefinitions },
    } = getState() as RootState;

    for (const id of ids) {
      const workflowId = id.toLowerCase();

      // Getting connection keys to delete
      const connectionKeysInUse = Object.keys(workflows).reduce((result: string[], currentId: string) => {
        if (currentId !== workflowId) {
          result.push(...workflows[currentId].connectionKeys.filter((key) => !result.includes(key)));
        }
        return result;
      }, []);
      const connectionKeys = (workflows[workflowId]?.connectionKeys ?? []).filter((key) => !connectionKeysInUse.includes(key));
      combinedConnectionKeys.push(...connectionKeys);

      // Getting parameter keys to delete
      const parameterKeys = Object.keys(parameterDefinitions).filter((key) => {
        const { associatedWorkflows, dynamicData } = parameterDefinitions[key];
        if (associatedWorkflows?.includes(workflowId)) {
          if (associatedWorkflows.length === 1) {
            return true;
          }

          // TODO: Try fetching the dynamic data from the next workflow in the list, fo rnow just deleting.
          parametersToUpdate[key] = {
            ...parameterDefinitions[key],
            associatedWorkflows: associatedWorkflows.filter((id) => id !== workflowId),
            dynamicData: dynamicData?.workflow === workflowId ? undefined : dynamicData,
          };
        }

        return false;
      });
      combinedParameterKeys.push(...parameterKeys);
    }

    return { ids, connectionKeys: combinedConnectionKeys, parameterKeys: combinedParameterKeys, parametersToUpdate };
  }
);

export const getTemplateConnections = async (
  state: RootState,
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>,
  workflows: Record<string, Partial<WorkflowTemplateData>>
) => {
  const {
    workflow: { subscriptionId, resourceGroup, isConsumption, logicAppName },
  } = state;

  if (isConsumption) {
    const definition = await getWorkflowDefinitionForConsumption(subscriptionId, resourceGroup, logicAppName as string);
    const connections = await getConnectionsForConsumption(subscriptionId, resourceGroup, logicAppName as string);
    const workflowId = getLogicAppId(subscriptionId, resourceGroup, logicAppName as string);
    const mapping = await getConnectionMappingInDefinition(definition, workflowId);

    const workflowWithDefinition = {
      [workflowId]: {
        id: workflowId,
        workflowDefinition: definition,
        connectionKeys: Object.keys(connections),
      },
    };

    dispatch(updateAllWorkflowsData(workflowWithDefinition));
    return { connections, mapping, workflowsWithDefinitions: workflowWithDefinition };
  }

  const allConnections = await getConnectionsForStandard(subscriptionId, resourceGroup, logicAppName as string);
  const workflowIds = Object.keys(workflows).map((id) => workflows[id].id);
  const promises = workflowIds.map((workflowId) => getDefinitionAndUsedConnectionMappings(workflowId as string));
  const workflowsData = clone(workflows);
  const allWorkflowsData = (await Promise.all(promises))
    .filter((data) => !!data)
    .reduce(
      (
        result: { id: string; kind?: string; definition: LogicAppsV2.WorkflowDefinition; mapping: Record<string, string> }[],
        data,
        index
      ) => {
        if (data?.definition) {
          result.push({ id: workflowIds[index] as string, ...data });
        }
        return result;
      },
      []
    );

  const connectionsInUse: Record<string, Template.Connection> = {};
  let allMappings: Record<string, string> = {};
  for (const workflowData of allWorkflowsData) {
    const { id: workflowId, definition, mapping } = workflowData;
    const connectionKeys = Object.values(mapping);
    workflowsData[workflowId] = {
      ...(workflowsData[workflowId] ?? {}),
      workflowDefinition: definition,
      kind: workflowData.kind,
      connectionKeys,
    };
    connectionKeys.forEach((key) => {
      if (!connectionsInUse[key] && allConnections[key]) {
        connectionsInUse[key] = allConnections[key];
      }
    });

    allMappings = { ...allMappings, ...mapping };
  }

  dispatch(updateAllWorkflowsData(workflowsData));
  return { connections: connectionsInUse, mapping: allMappings, workflowsWithDefinitions: workflowsData };
};

const getConnectionsForConsumption = async (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string
): Promise<Record<string, Template.Connection>> => {
  const queryClient = getReactQueryClient();
  try {
    const logicApp = await getConsumptionWorkflow(subscriptionId, resourceGroup, logicAppName, queryClient);
    const references = logicApp.properties.parameters?.$connections?.value ?? {};
    return Object.keys(references).reduce((result: Record<string, Template.Connection>, referenceKey) => {
      const { api, id } = references[referenceKey];
      result[referenceKey] = {
        connectorId: api?.id ?? id,
        kind: 'shared',
      };
      return result;
    }, {});
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.getConnectionsForConsumption',
      error,
      message: `Error while getting connections for workflow: ${logicAppName}`,
    });
    return {};
  }
};

const getConnectionsForStandard = async (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string
): Promise<Record<string, Template.Connection>> => {
  const queryClient = getReactQueryClient();
  try {
    const connectionsData = await getConnectionsInWorkflowApp(subscriptionId, resourceGroup, logicAppName, queryClient);
    return getTemplateConnectionsFromConnectionsData(connectionsData);
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.getConnectionsForStandard',
      error,
      message: `Error while getting connections for workflow: ${logicAppName}`,
    });
    return {};
  }
};

const getWorkflowDefinitionForStandard = async (workflowId: string): Promise<any> => {
  const queryClient = getReactQueryClient();
  const workflow = await getStandardWorkflow(workflowId, queryClient);
  return workflow.properties.files?.['workflow.json'];
};

const getWorkflowDefinitionForConsumption = async (subscriptionId: string, resourceGroup: string, logicAppName: string): Promise<any> => {
  const queryClient = getReactQueryClient();
  const workflow = await getConsumptionWorkflow(subscriptionId, resourceGroup, logicAppName, queryClient);
  return workflow.properties.definition;
};

const getDefinitionAndUsedConnectionMappings = async (
  workflowId: string
): Promise<{ definition: LogicAppsV2.WorkflowDefinition; kind?: string; mapping: Record<string, string> } | undefined> => {
  try {
    const { definition, kind } = await getWorkflowDefinitionForStandard(workflowId);
    const mapping = await getConnectionMappingInDefinition(definition, workflowId);
    return { definition, kind, mapping };
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.getDefinitionAndUsedConnectionMappings',
      error,
      message: `Error while getting definition and connection mappings for workflow: ${workflowId}`,
    });
    return undefined;
  }
};

export const getTemplateParameters = async (state: RootState, mapping: Record<string, string>) => {
  const {
    workflow: { isConsumption, subscriptionId, resourceGroup, logicAppName },
    operation: { inputParameters, dependencies },
  } = state;
  const allParameters = await getAllParametersForWorkflows(subscriptionId, resourceGroup, logicAppName as string, !!isConsumption);
  const currentUsedParameters: Record<string, Partial<Template.ParameterDefinition>> = {};
  const notFoundParameters: string[] = [];

  for (const nodeId of Object.keys(inputParameters)) {
    const [workflowId, operationId] = nodeId.split(delimiter);
    const inputDependencies = dependencies[nodeId].inputs;
    const parameters = getAllInputParameters(inputParameters[nodeId]);
    for (const parameter of parameters) {
      const parameterNames = getParameterReferencesFromValue(parameter.value);
      const addDynamicData = shouldAddDynamicData(parameter);

      for (const parameterName of parameterNames) {
        const currentParameter = currentUsedParameters[parameterName];
        if (!currentParameter) {
          const parameterDefinition = allParameters[parameterName];
          if (parameterDefinition) {
            currentUsedParameters[parameterName] = { ...parameterDefinition, name: parameterName, associatedWorkflows: [workflowId] };
          } else {
            notFoundParameters.push(`${workflowId}${delimiter}${parameterName}`);
          }
        } else if (!currentParameter.associatedWorkflows?.includes(workflowId)) {
          currentUsedParameters[parameterName].associatedWorkflows?.push(workflowId);
        }

        if (addDynamicData && currentUsedParameters[parameterName] && !currentUsedParameters[parameterName].dynamicData) {
          const dependency = inputDependencies[parameter.parameterKey];
          const dependencyType =
            dependency?.dependencyType === 'ListValues' ? 'list' : dependency?.dependencyType === 'TreeNavigation' ? 'picker' : undefined;
          if (dependencyType) {
            currentUsedParameters[parameterName] = {
              ...currentUsedParameters[parameterName],
              dynamicData: { workflow: workflowId, operation: operationId, type: dependencyType, connection: mapping[nodeId] },
            };
          }
        }
      }
    }
  }

  if (notFoundParameters.length) {
    LoggerService().log({
      level: LogEntryLevel.Warning,
      area: 'ConfigureTemplate.getTemplateParameters',
      message: `Parameters not found in workflows: ${notFoundParameters.join(', ')}`,
    });
  }

  return currentUsedParameters;
};

const getAllParametersForWorkflows = async (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  isConsumption: boolean
): Promise<Record<string, Partial<Template.ParameterDefinition>>> => {
  const queryClient = getReactQueryClient();
  let allParameters: Record<string, Partial<Template.ParameterDefinition>> = {};

  try {
    if (isConsumption) {
      const logicApp = await getConsumptionWorkflow(subscriptionId, resourceGroup, logicAppName, queryClient);
      const parametersWithValues = logicApp.properties.parameters ?? {};
      const parametersInDefinition = { ...(logicApp.properties.definition?.parameters ?? {}) };
      delete parametersInDefinition.$connections;
      allParameters = Object.keys(parametersInDefinition).reduce((result: Record<string, WorkflowParameter>, parameterKey: string) => {
        result[parameterKey] = {
          ...parametersInDefinition[parameterKey],
          default: parametersInDefinition[parameterKey].defaultValue,
          value: parametersWithValues[parameterKey]?.value,
        };
        return result;
      }, {});
    } else {
      allParameters = await getParametersInWorkflowApp(subscriptionId, resourceGroup, logicAppName, queryClient);
    }
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.getAllParametersForWorkflows',
      error,
      message: `Error while getting parameters for workflow: ${logicAppName}`,
    });
    return {};
  }

  return allParameters;
};

export const getWorkflowsWithDefinitions = async (
  { subscriptionId, resourceGroup, isConsumption, logicAppName }: WorkflowState,
  workflows: Record<string, Partial<WorkflowTemplateData>>
) => {
  if (isConsumption) {
    const definition = await getWorkflowDefinitionForConsumption(subscriptionId, resourceGroup, logicAppName as string);
    // TODO: cache getConnectionsForConsumption
    const workflowId = getLogicAppId(subscriptionId, resourceGroup, logicAppName as string);
    workflows[workflowId] = {
      ...(workflows[workflowId] ?? {}),
      workflowDefinition: definition,
    };
    return workflows;
  }

  const workflowIds = Object.keys(workflows);
  const promises = Object.keys(workflows).map((workflowId) => getWorkflowDefinitionForStandard(workflowId));
  // TODO: cache getConnectionsForStandard
  const allWorkflowsData = (await Promise.all(promises)).reduce((result: Record<string, Partial<WorkflowTemplateData>>, data, index) => {
    const { kind, definition: workflowDefinition } = data;
    if (workflowDefinition) {
      const id = workflowIds[index];
      result[id] = {
        ...workflows[id],
        id,
        kind,
        workflowDefinition,
      };
    }
    return result;
  }, {});

  return allWorkflowsData;
};
