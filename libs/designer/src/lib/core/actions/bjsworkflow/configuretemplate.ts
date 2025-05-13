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
  ArmResource,
} from '@microsoft/logic-apps-shared';
import {
  clone,
  DevLogger,
  getResourceNameFromId,
  getTriggerFromDefinition,
  InitConnectionService,
  InitLoggerService,
  InitOperationManifestService,
  InitResourceService,
  InitTemplateResourceService,
  InitWorkflowService,
  LogEntryLevel,
  LoggerService,
  TemplateResourceService,
  isLegacyDynamicValuesBuiltInExtension,
  equals,
} from '@microsoft/logic-apps-shared';
import type { RootState } from '../../state/templates/store';
import {
  getConnectionsInWorkflowApp,
  getConsumptionWorkflow,
  getParametersInWorkflowApp,
  getStandardWorkflow,
  getTemplate,
  getTemplateManifest,
  getWorkflowResourcesInTemplate,
  getWorkflowsInTemplate,
  resetTemplateWorkflowsQuery,
} from '../../configuretemplate/utils/queries';
import { getReactQueryClient } from '../../ReactQueryProvider';
import {
  delimiter,
  getConnectionMappingInDefinition,
  getDefinitionFromWorkflowManifest,
  getManifestAndDefinitionFromWorkflowData,
  getOperationDataInDefinitions,
  getParameterReferencesFromValue,
  getParametersForWorkflow,
  getSupportedSkus,
  getTemplateConnectionsFromConnectionsData,
} from '../../configuretemplate/utils/helper';
import {
  updateAllWorkflowsData,
  updateConnectionAndParameterDefinitions,
  updateEnvironment,
  updateTemplateParameterDefinition,
} from '../../state/templates/templateSlice';
import { loadTemplate, type WorkflowTemplateData } from './templates';
import { initializeNodeOperationInputsData, type NodeDependencies, type NodeInputs } from '../../state/operation/operationMetadataSlice';
import type { WorkflowParameter } from '../../../common/models/workflow';
import { getAllInputParameters } from '../../utils/parameters/helper';
import { shouldAddDynamicData } from '../../templates/utils/parametershelper';
import { setInitialData, type WorkflowState } from '../../state/templates/workflowSlice';

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
  async ({ templateId }: { templateId: string }, { dispatch }): Promise<{ status: string; enableWizard: boolean }> => {
    const templateName = getResourceNameFromId(templateId);
    const templateResource = await getTemplate(templateId);
    const manifest = await getTemplateManifest(templateId);
    dispatch(loadTemplate({ templateName, preLoadedManifest: manifest }));

    const allWorkflowsManifest = await getWorkflowsInTemplate(templateId);
    let workflowSourceId = '';
    let allParametersData: Record<string, Template.ParameterDefinition> = {};
    let allConnectionsData: Record<string, Template.Connection> = {};

    const allWorkflowsData = Object.keys(allWorkflowsManifest).reduce(
      (result: Record<string, Partial<WorkflowTemplateData>>, workflowId) => {
        const workflowManifest = allWorkflowsManifest[workflowId];
        const workflowDefinition = getDefinitionFromWorkflowManifest(workflowManifest);
        const { connections, parameters } = workflowManifest;

        if (!workflowSourceId) {
          workflowSourceId = workflowManifest?.metadata?.workflowSourceId as string;
        }

        allConnectionsData = { ...allConnectionsData, ...(connections ?? {}) };
        allParametersData = (parameters ?? []).reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
          const parameterId = parameter.name;
          if (result[parameterId]) {
            result[parameterId].associatedWorkflows?.push(workflowId);
          } else {
            result[parameterId] = {
              ...parameter,
              associatedWorkflows: [workflowId],
            };
          }
          return result;
        }, allParametersData);

        result[workflowId] = {
          id: workflowId,
          workflowName: workflowId,
          manifest: workflowManifest,
          workflowDefinition,
          connectionKeys: connections ? Object.keys(connections) : [],
          triggerType: getTriggerFromDefinition(workflowDefinition?.triggers ?? {}),
          isManageWorkflow: true,
          errors: { workflow: undefined },
        };
        return result;
      },
      {}
    );
    const updatedTemplateManifest = getUpdatedTemplateManifest(manifest, Object.values(allWorkflowsData), allConnectionsData);

    dispatch(updateAllWorkflowsData({ workflows: allWorkflowsData, manifest: updatedTemplateManifest }));
    dispatch(updateConnectionAndParameterDefinitions({ connections: allConnectionsData, parameterDefinitions: allParametersData }));

    if (workflowSourceId) {
      const segments = workflowSourceId.split('/');
      const isConsumption = equals(segments[6], 'microsoft.logic');
      dispatch(
        setInitialData({
          subscriptionId: segments[2],
          resourceGroup: segments[4],
          location: templateResource.location as string,
          workflowAppName: isConsumption ? '' : segments[8],
          logicAppName: segments[8],
          isConsumption,
          reloadServices: true,
        } as any)
      );
    }

    const operationsData = await getOperationDataInDefinitions(
      allWorkflowsData as Record<string, WorkflowTemplateData>,
      allConnectionsData
    );
    dispatch(initializeNodeOperationInputsData(operationsData));

    return {
      status: templateResource.properties?.state,
      enableWizard: allWorkflowsData && Object.keys(allWorkflowsData).length > 0,
    };
  }
);

export const updateWorkflowParameter = createAsyncThunk(
  'updateWorkflowParameter',
  async (
    {
      parameterId,
      definition,
      changedStatus,
    }: { parameterId: string; definition: Template.ParameterDefinition; changedStatus: Template.TemplateEnvironment | undefined },
    { getState, dispatch }
  ): Promise<void> => {
    const service = TemplateResourceService();
    const {
      template: { manifest, parameterDefinitions },
    } = getState() as RootState;
    const parameter = parameterDefinitions[parameterId];
    const allParameters = Object.values(parameterDefinitions);
    const associatedWorkflows = (parameter?.associatedWorkflows as string[]) ?? [];
    const promises: Promise<void>[] = [];
    const existingWorkflows = await getWorkflowResourcesInTemplate(manifest?.id as string);

    try {
      if (changedStatus) {
        await service.updateTemplate(manifest?.id as string, /* manifest */ undefined, changedStatus);
      }

      for (const workflowId of associatedWorkflows) {
        const parametersInWorkflow = getParametersForWorkflow(allParameters, workflowId).map((parameter) => {
          const updatedParameter = { ...parameter };
          delete updatedParameter.associatedWorkflows;
          delete updatedParameter.associatedOperationParameter;
          return updatedParameter;
        });
        promises.push(service.updateWorkflow(manifest?.id as string, workflowId, { parameters: parametersInWorkflow }));
      }

      await Promise.all(promises);

      if (changedStatus) {
        dispatch(updateEnvironment(changedStatus));
      }

      dispatch(
        updateTemplateParameterDefinition({
          parameterId: parameterId as string,
          data: definition,
        })
      );

      resetTemplateWorkflowsQuery(manifest?.id as string, /* clearRawData */ true);
    } catch (error: any) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'ConfigureTemplate.updateWorkflowParameter',
        error,
        message: `Error while updating parameter: ${parameterId} in template: ${manifest?.id}`,
      });
      await rollbackWorkflows(
        manifest?.id as string,
        changedStatus as Template.TemplateEnvironment,
        existingWorkflows.filter((workflow) => associatedWorkflows.includes(workflow.name)),
        /* clearWorkflows */ false
      );
      throw error;
    }
  }
);

export const initializeAndSaveWorkflowsData = createAsyncThunk(
  'initializeAndSaveWorkflowsData',
  async (
    {
      workflows,
      publishState,
      onSaveCompleted,
    }: {
      workflows: Record<string, Partial<WorkflowTemplateData>>;
      publishState: Template.TemplateEnvironment;
      onSaveCompleted?: () => void;
    },
    { getState, dispatch }
  ): Promise<void> => {
    const { manifest, status: oldState } = (getState() as RootState).template;
    const { connections, mapping, workflowsWithDefinitions } = await getTemplateConnections(getState() as RootState, dispatch, workflows);
    const operationsData = await getOperationDataInDefinitions(
      workflowsWithDefinitions as Record<string, WorkflowTemplateData>,
      connections
    );
    const { allInputs, allDependencies } = operationsData.reduce(
      (result: { allInputs: Record<string, NodeInputs>; allDependencies: Record<string, NodeDependencies> }, operationData) => {
        const { id, nodeInputs, nodeDependencies } = operationData;
        result.allInputs[id] = nodeInputs;
        result.allDependencies[id] = nodeDependencies;

        return result;
      },
      { allInputs: {}, allDependencies: {} }
    );

    const parameterDefinitions = await getTemplateParameters(getState() as RootState, allInputs, allDependencies, mapping);
    const updatedTemplateManifest = getUpdatedTemplateManifest(
      manifest as Template.TemplateManifest,
      Object.values(workflowsWithDefinitions),
      connections
    );

    await saveWorkflowsInTemplateInternal(
      updatedTemplateManifest,
      workflowsWithDefinitions,
      connections,
      parameterDefinitions,
      oldState as Template.TemplateEnvironment,
      publishState,
      /* clearWorkflows */ true
    );

    dispatch(updateAllWorkflowsData({ workflows: workflowsWithDefinitions, manifest: updatedTemplateManifest }));
    dispatch(updateConnectionAndParameterDefinitions({ connections, parameterDefinitions }));
    dispatch(initializeNodeOperationInputsData(operationsData));
    if (oldState !== publishState) {
      dispatch(updateEnvironment(publishState));
    }

    onSaveCompleted?.();
  }
);

export const saveWorkflowsData = createAsyncThunk(
  'saveWorkflowsData',
  async (
    {
      workflows,
      publishState,
      onSaveCompleted,
    }: {
      workflows: Record<string, Partial<WorkflowTemplateData>>;
      publishState: Template.TemplateEnvironment;
      onSaveCompleted?: () => void;
    },
    { getState, dispatch }
  ): Promise<void> => {
    const {
      template: { manifest, connections, parameterDefinitions, status: oldState },
    } = getState() as RootState;
    await saveWorkflowsInTemplateInternal(
      manifest as Template.TemplateManifest,
      workflows,
      connections,
      parameterDefinitions,
      oldState as Template.TemplateEnvironment,
      publishState,
      /* clearWorkflows */ false
    );
    dispatch(updateAllWorkflowsData({ workflows }));

    if (oldState !== publishState) {
      dispatch(updateEnvironment(publishState));
    }

    onSaveCompleted?.();
  }
);

const saveWorkflowsInTemplateInternal = async (
  templateManifest: Template.TemplateManifest,
  workflows: Record<string, Partial<WorkflowTemplateData>>,
  connections: Record<string, Template.Connection>,
  parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>,
  oldState: Template.TemplateEnvironment,
  publishState: Template.TemplateEnvironment,
  clearWorkflows = true
): Promise<void> => {
  const promises: Promise<void>[] = [];
  const service = TemplateResourceService();
  const templateId = templateManifest?.id as string;

  const existingWorkflows = await getWorkflowResourcesInTemplate(templateId);

  try {
    if (oldState !== publishState) {
      await service.updateTemplate(templateId, /* manifest */ undefined, publishState);
    }

    if (clearWorkflows) {
      await service.deleteAllWorkflows(templateId);
    }

    for (const workflowId of Object.keys(workflows)) {
      const { id } = workflows[workflowId];
      const workflowData = getManifestAndDefinitionFromWorkflowData(workflows[workflowId], connections, parameterDefinitions);
      promises.push(service.addWorkflow(templateId, id ?? '', workflowData));
    }

    await Promise.all(promises);
    resetTemplateWorkflowsQuery(templateId, /* clearRawData */ true);
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.saveWorkflowsInTemplateInternal',
      error,
      message: `Error while saving workflows in template: ${templateId}`,
      args: [`clearWorkflows: ${clearWorkflows}`],
    });
    await rollbackWorkflows(templateId, oldState, existingWorkflows, clearWorkflows);
    throw error;
  }
};

const rollbackWorkflows = async (
  id: string,
  state: Template.TemplateEnvironment | undefined,
  workflows: ArmResource<any>[],
  clearWorkflows = true
) => {
  const service = TemplateResourceService();
  const promises: Promise<void>[] = [];

  try {
    if (state) {
      await service.updateTemplate(id, /* manifest */ undefined, state);
    }

    if (clearWorkflows) {
      await service.deleteAllWorkflows(id);
    }

    for (const workflow of workflows) {
      promises.push(
        service.updateWorkflow(id, workflow.name, (workflow.properties?.manifest as Template.WorkflowManifest) ?? {}, /* rawData */ true)
      );
    }

    await Promise.all(promises);
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.rollbackWorkflows',
      error,
      message: `Error while rolling back workflows in template: ${id}`,
      args: [`clearWorkflows: ${clearWorkflows}`],
    });
    resetTemplateWorkflowsQuery(id, /* clearRawData */ true);

    throw error;
  }
};

export const deleteWorkflowData = createAsyncThunk(
  'deleteWorkflowData',
  async (
    { ids }: { ids: string[] },
    { getState }
  ): Promise<{
    ids: string[];
    manifest: Template.TemplateManifest;
    connections: Record<string, Template.Connection>;
    parameters: Record<string, Template.ParameterDefinition>;
    disableWizard: boolean;
  }> => {
    const combinedConnectionKeys: string[] = [];
    const combinedParameterKeys: string[] = [];
    const parametersToUpdate: Record<string, Partial<Template.ParameterDefinition>> = {};
    const promises: Promise<void>[] = [];
    const {
      template: { workflows, parameterDefinitions, connections, manifest },
    } = getState() as RootState;
    const templateId = manifest?.id as string;

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

      promises.push(TemplateResourceService().deleteWorkflow(templateId, workflowId));
    }

    await Promise.all(promises);
    resetTemplateWorkflowsQuery(templateId, /* clearRawData */ true);

    const finalWorkflows = Object.values(workflows).filter((workflowData) => !ids.includes(workflowData.id));
    const finalConnections = { ...connections };
    for (const key of combinedConnectionKeys) {
      delete finalConnections[key];
    }

    const finalParameterDefinitions = { ...parameterDefinitions, ...parametersToUpdate };
    for (const key of combinedParameterKeys) {
      delete finalParameterDefinitions[key];
    }

    const updatedTemplateManifest = getUpdatedTemplateManifest(manifest as Template.TemplateManifest, finalWorkflows, finalConnections);
    return {
      ids,
      manifest: updatedTemplateManifest,
      connections: finalConnections,
      parameters: finalParameterDefinitions as Record<string, Template.ParameterDefinition>,
      disableWizard: finalWorkflows.length === 0,
    };
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
    const workflowId = Object.values(workflows)[0].id as string;
    const mapping = await getConnectionMappingInDefinition(definition, workflowId);

    const workflowWithDefinition = {
      [workflowId]: {
        id: workflowId,
        workflowDefinition: definition,
        isManageWorkflow: true,
        triggerType: getTriggerFromDefinition(definition?.triggers ?? {}),
        connectionKeys: Object.keys(connections),
      },
    };

    return { connections, mapping, workflowsWithDefinitions: workflowWithDefinition };
  }

  const allConnections = await getConnectionsForStandard(subscriptionId, resourceGroup, logicAppName as string);
  const allWorkflows = Object.values(workflows);
  const promises = allWorkflows.map((workflow) =>
    getDefinitionAndUsedConnectionMappings(workflow.manifest?.metadata?.workflowSourceId as string, workflow.id as string)
  );
  const workflowsData = clone(workflows);
  const allWorkflowsData = (await Promise.all(promises))
    .filter((data) => !!data)
    .reduce(
      (result: { id: string; kind?: string; definition: LogicAppsV2.WorkflowDefinition; mapping: Record<string, string> }[], data) => {
        if (data?.definition) {
          result.push({ ...data });
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
      isManageWorkflow: true,
      triggerType: getTriggerFromDefinition(definition?.triggers ?? {}),
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
  sourceWorkflowId: string,
  workflowId: string
): Promise<{ id: string; definition: LogicAppsV2.WorkflowDefinition; kind?: string; mapping: Record<string, string> } | undefined> => {
  try {
    const { definition, kind } = await getWorkflowDefinitionForStandard(sourceWorkflowId);
    const mapping = await getConnectionMappingInDefinition(definition, workflowId);
    return { id: workflowId, definition, kind, mapping };
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.getDefinitionAndUsedConnectionMappings',
      error,
      message: `Error while getting definition and connection mappings for workflow: ${sourceWorkflowId}`,
    });
    return undefined;
  }
};

export const getTemplateParameters = async (
  state: RootState,
  inputParameters: Record<string, NodeInputs>,
  dependencies: Record<string, NodeDependencies>,
  mapping: Record<string, string>
) => {
  const {
    workflow: { isConsumption, subscriptionId, resourceGroup, logicAppName },
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
            dependency?.dependencyType === 'ListValues' && !isLegacyDynamicValuesBuiltInExtension(dependency.definition)
              ? 'list'
              : dependency?.dependencyType === 'TreeNavigation'
                ? 'picker'
                : undefined;
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
      const parametersInDefinition = { ...(logicApp.properties.definition?.parameters ?? {}) };
      delete parametersInDefinition.$connections;
      allParameters = Object.keys(parametersInDefinition).reduce((result: Record<string, WorkflowParameter>, parameterKey: string) => {
        result[parameterKey] = {
          ...parametersInDefinition[parameterKey],
          default: parametersInDefinition[parameterKey].defaultValue,
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
    const workflowId = Object.values(workflows)[0].id as string;
    workflows[workflowId] = {
      ...(workflows[workflowId] ?? {}),
      workflowDefinition: definition,
      isManageWorkflow: true,
      triggerType: getTriggerFromDefinition(definition?.triggers ?? {}),
    };
    return workflows;
  }

  const allWorkflowKeys = Object.keys(workflows);
  const allWorkflows = Object.values(workflows);

  const promises = allWorkflows.map((workflow) =>
    getWorkflowDefinitionForStandard(workflow.manifest?.metadata?.workflowSourceId as string)
  );
  const allWorkflowsData = (await Promise.all(promises)).reduce((result: Record<string, Partial<WorkflowTemplateData>>, data, index) => {
    const { kind, definition: workflowDefinition } = data;
    if (workflowDefinition) {
      const workflowId = allWorkflowKeys[index];
      const id = allWorkflows[index].id as string;

      result[workflowId] = {
        ...workflows[workflowId],
        id,
        kind,
        workflowDefinition,
        triggerType: getTriggerFromDefinition(workflowDefinition?.triggers ?? {}),
      };
    }
    return result;
  }, {});

  return allWorkflowsData;
};

const getUpdatedTemplateManifest = (
  manifest: Template.TemplateManifest,
  workflows: Partial<WorkflowTemplateData>[],
  connections: Record<string, Template.Connection>
) => {
  return {
    ...(manifest ?? {}),
    skus: getSupportedSkus(connections),
    details: {
      ...(manifest?.details ?? {}),
      Type: workflows.length > 1 ? 'Accelerator' : 'Workflow',
      Trigger: workflows.length === 1 ? workflows[0].triggerType : undefined,
    },
  } as Template.TemplateManifest;
};
