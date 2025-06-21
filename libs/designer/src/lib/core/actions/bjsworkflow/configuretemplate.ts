import type { ThunkDispatch } from '@reduxjs/toolkit';
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
  getIntl,
  normalizeConnectorId,
  getPropertyValue,
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
  resetAllTemplatesQuery,
  resetTemplateQuery,
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
  sanitizeConnectorId,
  sanitizeConnectorIds,
  suffixConnectionsWithIdentifier,
  suffixParametersWithIdentifier,
} from '../../configuretemplate/utils/helper';
import {
  setApiValidationErrors,
  updateAllWorkflowsData,
  updateConnectionAndParameterDefinitions,
  updateEnvironment,
  updateTemplateParameterDefinition,
} from '../../state/templates/templateSlice';
import type { WorkflowTemplateData } from './templates';
import {
  initializeNodeOperationInputsData,
  type NodeOperation,
  type NodeDependencies,
  type NodeInputs,
} from '../../state/operation/operationMetadataSlice';
import type { WorkflowParameter } from '../../../common/models/workflow';
import { getAllInputParameters } from '../../utils/parameters/helper';
import { shouldAddDynamicData } from '../../templates/utils/parametershelper';
import { setInitialData, type WorkflowState } from '../../state/templates/workflowSlice';
import { parseValidationError, type TemplateValidationError } from '../../configuretemplate/utils/errors';

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
    const templateResource = await getTemplate(templateId);
    const manifest = await getTemplateManifest(templateId);

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
          errors: { general: undefined, workflow: undefined },
        };
        return result;
      },
      {}
    );
    const updatedTemplateManifest = getUpdatedTemplateManifest(clone(manifest), Object.values(allWorkflowsData), allConnectionsData);

    dispatch(updateAllWorkflowsData({ workflows: allWorkflowsData, manifest: updatedTemplateManifest, reset: true }));
    dispatch(updateConnectionAndParameterDefinitions({ connections: allConnectionsData, parameterDefinitions: allParametersData }));

    if (workflowSourceId) {
      dispatch(loadResourceDetailsFromWorkflowSource({ workflowSourceId }));
    }

    const normalizedConnections = Object.keys(allConnectionsData).reduce((result: Record<string, Template.Connection>, key) => {
      const connection = { ...allConnectionsData[key] };

      if (equals(connection.kind, 'shared')) {
        connection.connectorId = normalizeConnectorId(
          connection.connectorId,
          workflowSourceId.split('/')[2],
          templateResource.location as string
        );
      }

      result[key] = connection;
      return result;
    }, {});

    const operationsData = await getOperationDataInDefinitions(
      allWorkflowsData as Record<string, WorkflowTemplateData>,
      normalizedConnections
    );
    dispatch(initializeNodeOperationInputsData(operationsData));

    return {
      status: templateResource.properties?.state,
      enableWizard: allWorkflowsData && Object.keys(allWorkflowsData).length > 0,
    };
  }
);

export const loadResourceDetailsFromWorkflowSource = createAsyncThunk(
  'loadResourceDetailsFromWorkflowSource',
  async ({ workflowSourceId }: { workflowSourceId: string }, { dispatch, getState }): Promise<void> => {
    const segments = workflowSourceId.split('/');
    const isConsumption = equals(segments[6], 'microsoft.logic');
    const subscriptionId = segments[2];
    dispatch(
      setInitialData({
        subscriptionId,
        resourceGroup: segments[4],
        location: (getState() as RootState).workflow.location,
        workflowAppName: isConsumption ? '' : segments[8],
        logicAppName: segments[8],
        isConsumption,
        reloadServices: true,
      } as any)
    );
  }
);

export const updateWorkflowParameter = createAsyncThunk(
  'updateWorkflowParameter',
  async (
    { parameterId, definition }: { parameterId: string; definition: Template.ParameterDefinition },
    { getState, dispatch }
  ): Promise<void> => {
    const service = TemplateResourceService();
    const {
      template: { manifest, parameterDefinitions },
    } = getState() as RootState;
    const modifiedParameterDefinitions = {
      ...parameterDefinitions,
      [parameterId]: {
        ...parameterDefinitions?.[parameterId],
        ...definition,
      },
    };
    const parameter = modifiedParameterDefinitions[parameterId];
    const allParameters = Object.values(modifiedParameterDefinitions);
    const associatedWorkflows = (parameter?.associatedWorkflows as string[]) ?? [];
    const promises: Promise<void>[] = [];
    const existingWorkflows = await getWorkflowResourcesInTemplate(manifest?.id as string);
    const existingTemplate = await getTemplate(manifest?.id as string);

    try {
      // 1. Update the parameter in the template
      // 2. Update the template state to take in the new changes for validation

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

      dispatch(setApiValidationErrors({ error: undefined, source: 'parameters' }));
      dispatch(
        updateTemplateParameterDefinition({
          parameterId: parameterId as string,
          data: definition,
        })
      );

      resetTemplateWorkflowsQuery(manifest?.id as string, /* clearRawData */ true);
    } catch (error: any) {
      dispatch(getTemplateValidationError({ errorResponse: error, source: 'parameters' }));
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'ConfigureTemplate.updateWorkflowParameter',
        error,
        message: `Error while updating parameter: ${parameterId} in template: ${manifest?.id}`,
      });
      await rollbackWorkflows(
        manifest?.id as string,
        existingTemplate,
        /* state */ undefined,
        existingWorkflows.filter((workflow) => associatedWorkflows.includes(workflow.name)),
        /* clearWorkflows */ false,
        /* addedWorkflowIds */ [],
        dispatch
      );
    }
  }
);

export const addWorkflowsData = createAsyncThunk(
  'addWorkflowsData',
  async (
    {
      workflows, // Note: only workflows to be added
      onSaveCompleted,
    }: {
      workflows: Record<string, Partial<WorkflowTemplateData>>;
      onSaveCompleted?: () => void;
    },
    { getState, dispatch }
  ): Promise<void> => {
    const { manifest, status: oldState, parameterDefinitions: existingParameters } = (getState() as RootState).template;
    const { connections, mapping, workflowsWithDefinitions } = await getTemplateConnections(getState() as RootState, workflows);
    const {
      connections: updatedConnections,
      workflowsData: updatedWorkflowsData,
      mapping: finalMapping,
    } = suffixConnectionsWithIdentifier(connections, workflowsWithDefinitions, mapping);

    const operationsData = await getOperationDataInDefinitions(
      updatedWorkflowsData as Record<string, WorkflowTemplateData>,
      updatedConnections
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

    const parameterDefinitions = await getTemplateParameters(getState() as RootState, allInputs, allDependencies, finalMapping);
    const { parameters: updatedParameterDefinitions, workflowsData: finalWorkflowsData } = suffixParametersWithIdentifier(
      parameterDefinitions,
      updatedWorkflowsData
    );
    const finalParameterDefinitions = mergeParametersWithExisting(existingParameters, updatedParameterDefinitions);

    const finalConnections = sanitizeConnectorIds(updatedConnections);
    const updatedTemplateManifest = getUpdatedTemplateManifest(
      manifest as Template.TemplateManifest,
      Object.values(finalWorkflowsData),
      finalConnections
    );

    const newState = equals(oldState, 'Development') ? undefined : 'Development';
    // If the old state is published then we need to move template to development state before updating any workflows.
    // Users would be informed in the UI about this change.
    await saveWorkflowsInTemplateInternal(
      dispatch,
      updatedTemplateManifest,
      finalWorkflowsData,
      finalConnections,
      finalParameterDefinitions,
      oldState as Template.TemplateEnvironment,
      newState,
      /* updateTemplateManifest */ true,
      /* addingWorkflows */ true
    );

    dispatch(updateAllWorkflowsData({ workflows: finalWorkflowsData, manifest: updatedTemplateManifest }));
    dispatch(updateConnectionAndParameterDefinitions({ connections: finalConnections, parameterDefinitions: finalParameterDefinitions }));
    dispatch(initializeNodeOperationInputsData(operationsData));

    if (newState) {
      dispatch(updateEnvironment(newState));
    }

    onSaveCompleted?.();
  }
);

export const saveWorkflowsData = createAsyncThunk(
  'saveWorkflowsData',
  async (
    {
      workflows,
      onSaveCompleted,
    }: {
      workflows: Record<string, Partial<WorkflowTemplateData>>;
      onSaveCompleted?: () => void;
    },
    { getState, dispatch }
  ): Promise<void> => {
    const {
      template: { manifest, connections, parameterDefinitions, status: oldState },
    } = getState() as RootState;
    await saveWorkflowsInTemplateInternal(
      dispatch,
      manifest as Template.TemplateManifest,
      workflows,
      connections,
      parameterDefinitions,
      oldState as Template.TemplateEnvironment,
      /* newState */ undefined,
      /* updateTemplateManifest */ false,
      /* addingWorkflows */ false
    );

    dispatch(updateAllWorkflowsData({ workflows }));

    onSaveCompleted?.();
  }
);

const saveWorkflowsInTemplateInternal = async (
  dispatch: ThunkDispatch<unknown, unknown, any>,
  templateManifest: Template.TemplateManifest,
  workflows: Record<string, Partial<WorkflowTemplateData>>,
  connections: Record<string, Template.Connection>,
  parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>,
  oldState: Template.TemplateEnvironment,
  newState: Template.TemplateEnvironment | undefined,
  updateTemplateManifest = false,
  addingWorkflows = false
): Promise<void> => {
  const promises: Promise<void>[] = [];
  const service = TemplateResourceService();
  const templateId = templateManifest?.id as string;

  const workflowIds = Object.values(workflows).map((workflow) => (workflow.id ?? '').toLowerCase());
  const existingWorkflows = await getWorkflowResourcesInTemplate(templateId);
  const workflowsBeingUpdated = addingWorkflows
    ? []
    : existingWorkflows.filter((workflow) => workflowIds.includes(workflow.name.toLowerCase()));
  const existingTemplate = await getTemplate(templateId);

  try {
    // 1. Add/Update all workflows
    // 2. Update template state to make sure new changes are present for validation
    for (const workflowId of Object.keys(workflows)) {
      const { id } = workflows[workflowId];
      const workflowData = getManifestAndDefinitionFromWorkflowData(workflows[workflowId], connections, parameterDefinitions);
      promises.push(service.addWorkflow(templateId, id ?? '', workflowData));
    }

    await Promise.all(promises);

    if (updateTemplateManifest || newState) {
      await service.updateTemplate(templateId, templateManifest, newState);
    }
    resetTemplateQuery(templateId);
    resetTemplateWorkflowsQuery(templateId, /* clearRawData */ true);
    dispatch(setApiValidationErrors({ error: undefined, source: 'workflows' }));
  } catch (error: any) {
    dispatch(getTemplateValidationError({ errorResponse: error, source: 'workflows' }));
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.saveWorkflowsInTemplateInternal',
      error,
      message: `Error while saving workflows in template: ${templateId}`,
      args: [`workflowIds: ${Object.keys(workflows).join(', ')}`, `newState: ${newState}`],
    });
    await rollbackWorkflows(templateId, existingTemplate, oldState, workflowsBeingUpdated, addingWorkflows, workflowIds, dispatch);
    throw error;
  }
};

export const saveTemplateData = createAsyncThunk(
  'saveTemplateData',
  async (
    {
      templateManifest,
      publishState,
      workflows,
      onSaveCompleted,
    }: {
      templateManifest: Template.TemplateManifest;
      workflows: Record<string, Partial<WorkflowTemplateData>>;
      publishState?: Template.TemplateEnvironment;
      onSaveCompleted: () => void;
    },
    { dispatch }
  ): Promise<void> => {
    const service = TemplateResourceService();
    const templateId = templateManifest?.id as string;
    const existingWorkflows = await getWorkflowResourcesInTemplate(templateId);

    try {
      const workflowsData = Object.values(workflows);
      const isSingleWorkflow = workflowsData.length === 1;
      if (isSingleWorkflow) {
        await service.updateWorkflow(templateId, workflowsData[0]?.id as string, {
          title: templateManifest?.title,
          summary: templateManifest?.summary,
        });
        resetTemplateWorkflowsQuery(templateId, /* rawData */ true);
      }

      await service.updateTemplate(templateId, templateManifest, publishState);
      resetTemplateQuery(templateId);
      dispatch(setApiValidationErrors({ error: undefined, source: 'template' }));

      if (publishState) {
        dispatch(updateEnvironment(publishState));
      }

      onSaveCompleted();
    } catch (error: any) {
      dispatch(getTemplateValidationError({ errorResponse: error, source: 'template' }));
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'ConfigureTemplate.saveTemplateData',
        error,
        message: `Error while updating template manifest: ${templateId}`,
      });
      await rollbackWorkflows(
        templateId,
        /* template */ undefined,
        /* state */ undefined,
        existingWorkflows,
        /* clearWorkflows */ false,
        /* addedWorkflowIds */ [],
        dispatch
      );
    }
  }
);

const rollbackWorkflows = async (
  id: string,
  template: ArmResource<any> | undefined,
  state: Template.TemplateEnvironment | undefined,
  workflows: ArmResource<any>[],
  clearWorkflows = true,
  addedWorkflowIds: string[] = [],
  dispatch: ThunkDispatch<unknown, unknown, any>
) => {
  const service = TemplateResourceService();
  const promises: Promise<void>[] = [];

  try {
    if (state && template) {
      await service.updateTemplate(id, template.properties?.manifest, state);
    }

    if (clearWorkflows) {
      for (const workflowId of addedWorkflowIds) {
        promises.push(service.deleteWorkflow(id, workflowId));
      }
    } else {
      for (const workflow of workflows) {
        promises.push(
          service.updateWorkflow(id, workflow.name, (workflow.properties?.manifest as Template.WorkflowManifest) ?? {}, /* rawData */ true)
        );
      }
    }

    await Promise.all(promises);
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.rollbackWorkflows',
      error,
      message: `Error while rolling back workflows in template: ${id}`,
      args: [
        `workflowIds: ${Object.keys(workflows).join(', ')}`,
        `state: ${state}`,
        `clearWorkflows: ${clearWorkflows}`,
        `newWorkflowIds: ${addedWorkflowIds.join(', ')}`,
      ],
    });
    resetAllTemplatesQuery(id, /* clearRawData */ true);

    dispatch(getTemplateValidationError(new Error('Something went wrong while saving the data. Please try again.') as any));
  }
};

export const getTemplateValidationError = createAsyncThunk(
  'getTemplateValidationError',
  async ({ errorResponse, source }: { errorResponse: { error: TemplateValidationError }; source: string }, { dispatch }) => {
    const intl = getIntl();
    const general = intl.formatMessage({
      defaultMessage: 'Template validation failed. Please fix the errors before proceeding.',
      id: 'FeAx9p',
      description: 'Error message when template validation fails',
    });
    let result: any;
    if (errorResponse?.error) {
      result = {
        ...parseValidationError(errorResponse.error),
        general,
      };
    } else {
      result = (errorResponse as any)?.message
        ? ({ general: `${general}. Error Details: ${(errorResponse as any).message}` } as any)
        : { general };
    }

    dispatch(setApiValidationErrors({ error: result, source }));
  }
);

export const deleteWorkflowData = createAsyncThunk(
  'deleteWorkflowData',
  async (
    { ids }: { ids: string[] },
    { getState, dispatch }
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
      template: { workflows, parameterDefinitions, connections, manifest, status: oldState },
      operation: { operationInfo },
    } = getState() as RootState;
    const templateId = manifest?.id as string;

    const newState = equals(oldState, 'Development') ? undefined : 'Development';
    if (newState) {
      // If the old state is published then we need to move template to development state before deleting any workflows.
      // Users would be informed in the UI about this change.
      await TemplateResourceService().updateTemplate(templateId, /* manifest */ undefined, newState);
      resetTemplateQuery(templateId);
      dispatch(updateEnvironment(newState));
    }

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
    updatedTemplateManifest.featuredConnectors = getFeaturedConnectorsForWorkflows(
      finalWorkflows,
      operationInfo,
      manifest?.featuredConnectors
    );

    await TemplateResourceService().updateTemplate(templateId, updatedTemplateManifest, /* state */ undefined);
    resetTemplateQuery(templateId);

    return {
      ids,
      manifest: updatedTemplateManifest,
      connections: finalConnections,
      parameters: finalParameterDefinitions as Record<string, Template.ParameterDefinition>,
      disableWizard: finalWorkflows.length === 0,
    };
  }
);

export const getTemplateConnections = async (state: RootState, workflows: Record<string, Partial<WorkflowTemplateData>>) => {
  const {
    workflow: { subscriptionId, resourceGroup, isConsumption, logicAppName },
  } = state;

  if (isConsumption) {
    const definition = await getWorkflowDefinitionForConsumption(subscriptionId, resourceGroup, logicAppName as string);
    const connections = await getConnectionsForConsumption(subscriptionId, resourceGroup, logicAppName as string);
    const workflowKey = Object.keys(workflows)[0];
    const workflowId = Object.values(workflows)[0].id as string;
    const mapping = await getConnectionMappingInDefinition(definition, workflowId);

    const workflowWithDefinition = {
      [workflowId]: {
        ...(workflows[workflowKey] ?? {}),
        workflowDefinition: definition,
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
  return getPropertyValue(workflow.properties.files, 'workflow.json');
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
              dynamicData: {
                workflow: workflowId,
                operation: operationId,
                type: dependencyType,
                connection: getPropertyValue(mapping, nodeId),
              },
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

  return Object.keys(allParameters).reduce((result: Record<string, Partial<Template.ParameterDefinition>>, parameterKey: string) => {
    const parameter = { ...allParameters[parameterKey] };
    delete (parameter as any).defaultValue;
    delete (parameter as any).metadata;
    result[parameterKey] = parameter;
    return result;
  }, {});
};

export const getWorkflowsWithDefinitions = async (
  { subscriptionId, resourceGroup, isConsumption, logicAppName }: WorkflowState,
  workflows: Record<string, Partial<WorkflowTemplateData>>
) => {
  if (isConsumption) {
    const definition = await getWorkflowDefinitionForConsumption(subscriptionId, resourceGroup, logicAppName as string);
    const workflowKey = Object.keys(workflows)[0];
    return {
      [workflowKey]: {
        ...(workflows[workflowKey] ?? {}),
        id: workflows[workflowKey].id,
        workflowDefinition: definition,
        triggerType: getTriggerFromDefinition(definition?.triggers ?? {}),
      },
    };
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

const getFeaturedConnectorsForWorkflows = (
  workflows: Partial<WorkflowTemplateData>[],
  operationInfo: Record<string, NodeOperation>,
  featuredConnectors: Template.FeaturedConnector[] = []
): Template.FeaturedConnector[] => {
  const workflowIds = workflows.map((workflow) => workflow.id?.toLowerCase());
  const allConnectorIds: Set<string> = new Set<string>();
  for (const workflowId of workflowIds) {
    for (const nodeId of Object.keys(operationInfo)) {
      if (nodeId.toLowerCase().startsWith(`${workflowId}${delimiter}`)) {
        const connectorId = sanitizeConnectorId(operationInfo[nodeId]?.connectorId).toLowerCase();
        if (connectorId && !allConnectorIds.has(connectorId)) {
          allConnectorIds.add(connectorId);
        }
      }
    }
  }

  return featuredConnectors.filter((featuredConnector) => allConnectorIds.has(featuredConnector.id.toLowerCase()));
};

const mergeParametersWithExisting = (
  existingParameters: Record<string, Partial<Template.ParameterDefinition>>,
  newParameters: Record<string, Partial<Template.ParameterDefinition>>
): Record<string, Partial<Template.ParameterDefinition>> => {
  const mergedParameters: Record<string, Partial<Template.ParameterDefinition>> = {};

  for (const [key, newParameter] of Object.entries(newParameters)) {
    const existingParameter = existingParameters[key];
    if (existingParameter) {
      mergedParameters[key] = {
        ...existingParameter,
        associatedWorkflows: [...new Set([...(existingParameter.associatedWorkflows ?? []), ...(newParameter.associatedWorkflows ?? [])])],
      };
      if (!existingParameter.dynamicData && newParameter.dynamicData) {
        mergedParameters[key].dynamicData = newParameter.dynamicData;
      }
    } else {
      mergedParameters[key] = newParameter;
    }
  }

  return mergedParameters;
};
