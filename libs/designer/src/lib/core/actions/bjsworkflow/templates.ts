import {
  DevLogger,
  getIntl,
  type ILoggerService,
  InitConnectionParameterEditorService,
  InitConnectionService,
  InitConnectorService,
  InitExperimentationServiceService,
  InitGatewayService,
  InitLoggerService,
  InitOAuthService,
  InitOperationManifestService,
  InitTemplateService,
  InitTenantService,
  InitWorkflowService,
  InitResourceService,
  LogEntryLevel,
  LoggerService,
  type LogicAppsV2,
  TemplateService,
  type Template,
  clone,
  getTriggerFromDefinition,
  InitTemplateResourceService,
  equals,
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../state/templates/store';
import type { TemplateServiceOptions } from '../../templates/TemplatesDesignerContext';
import { initializeParametersMetadata } from '../../templates/utils/parametershelper';
import { initializeNodeOperationInputsData } from '../../state/operation/operationMetadataSlice';
import { updateAllTemplateParameterDefinitions } from '../../state/templates/templateSlice';
import { checkWorkflowNameWithRegex, getCurrentWorkflowNames } from '../../templates/utils/helper';
import type { TemplateData } from '../../state/templates/manifestSlice';
import { clearConnectionCaches } from '../../queries/connections';
import { getWorkflowsInTemplate } from '../../configuretemplate/utils/queries';
import { getDefinitionFromWorkflowManifest } from '../../configuretemplate/utils/helper';
import { getCustomTemplates } from '../../templates/utils/queries';

export interface WorkflowTemplateData {
  id: string;
  workflowDefinition: LogicAppsV2.WorkflowDefinition;
  manifest: Template.WorkflowManifest;
  workflowName?: string;
  kind?: string;
  images?: {
    light?: string;
    dark?: string;
  };
  isManageWorkflow?: boolean;
  triggerType: string;
  connectionKeys: string[];
  errors: WorkflowErrors;
}

export interface TemplatePayload {
  manifest: Template.TemplateManifest | undefined;
  workflows: Record<string, WorkflowTemplateData>;
  parameterDefinitions: Record<string, Template.ParameterDefinition>;
  connections: Record<string, Template.Connection>;
  errors: TemplateErrors;
}

export interface TemplateErrors {
  general: string | undefined;
  manifest: Record<string, string | undefined>;
  parameters: Record<string, string | undefined>;
  connections: string | undefined;
}

export interface WorkflowErrors {
  general: string | undefined;
  workflow: string | undefined;
  kind?: string;
  manifest?: Record<string, string | undefined>;
  triggerDescription?: string;
}

export const initializeWorkflowMetadata = createAsyncThunk(
  'initializeWorkflowMetadata',
  async (_, { getState, dispatch }): Promise<void> => {
    const currentState: RootState = getState() as RootState;
    const { templateName, workflows, parameterDefinitions, connections } = currentState.template;
    const { subscriptionId, location } = currentState.workflow;
    const { inputsPayload, parameterDefinitions: templateParametersToOverride } = await initializeParametersMetadata(
      templateName as string,
      workflows,
      parameterDefinitions,
      connections,
      { subscriptionId, location }
    );

    if (inputsPayload.length) {
      dispatch(initializeNodeOperationInputsData(inputsPayload));
      dispatch(updateAllTemplateParameterDefinitions(templateParametersToOverride));
    }
  }
);

export const isMultiWorkflowTemplate = (manifest: Template.TemplateManifest | undefined): boolean => {
  return equals(manifest?.details.Type, 'Accelerator');
};

export const resetStateOnResourceChange = createAsyncThunk(
  'resetStateOnResourceChange',
  async (services: Partial<TemplateServiceOptions>) => {
    clearConnectionCaches();
    initializeServices(services);
    return true;
  }
);

export const initializeTemplateServices = createAsyncThunk('initializeTemplateServices', async (services: TemplateServiceOptions) => {
  const { loggerService, experimentationService } = services;
  const loggerServices: ILoggerService[] = [];
  if (loggerService) {
    loggerServices.push(loggerService);
  }
  if (process.env.NODE_ENV !== 'production') {
    loggerServices.push(new DevLogger());
  }
  InitLoggerService(loggerServices);

  initializeServices(services);

  // Experimentation service is being used to A/B test features in the designer so in case client does not want to use the A/B test feature,
  // we are always defaulting to the false implementation of the experimentation service.
  InitExperimentationServiceService(experimentationService);

  return true;
});

const initializeServices = ({
  connectionService,
  operationManifestService,
  connectorService,
  workflowService,
  oAuthService,
  gatewayService,
  tenantService,
  connectionParameterEditorService,
  templateService,
  resourceService,
  templateResourceService,
}: Partial<TemplateServiceOptions>) => {
  if (connectionService) {
    InitConnectionService(connectionService);
  }

  if (operationManifestService) {
    InitOperationManifestService(operationManifestService);
  }

  if (oAuthService) {
    InitOAuthService(oAuthService);
  }

  if (workflowService) {
    InitWorkflowService(workflowService);
  }

  if (connectorService) {
    InitConnectorService(connectorService);
  }

  if (gatewayService) {
    InitGatewayService(gatewayService);
  }
  if (tenantService) {
    InitTenantService(tenantService);
  }
  if (connectionParameterEditorService) {
    InitConnectionParameterEditorService(connectionParameterEditorService);
  }
  if (templateService) {
    InitTemplateService(templateService);
  }

  if (resourceService) {
    InitResourceService(resourceService);
  }

  if (templateResourceService) {
    InitTemplateResourceService(templateResourceService);
  }
};

export const loadCustomTemplates = createAsyncThunk(
  'loadCustomTemplates',
  async (_, { getState }): Promise<Record<string, TemplateData>> => {
    try {
      const { subscriptionId, resourceGroup } = (getState() as RootState).workflow;
      const customTemplates = await getCustomTemplates(subscriptionId, resourceGroup);
      return customTemplates.reduce((result: Record<string, TemplateData>, template) => {
        result[template.id.toLowerCase()] = {
          ...template.manifest,
          publishState: template.state,
          details: { ...template.manifest.details, publishedBy: 'Custom' } as any,
        };

        return result;
      }, {});
    } catch (ex) {
      console.error(ex);
      return {};
    }
  }
);

export const loadCustomTemplateArtifacts = createAsyncThunk('loadCustomTemplateArtifacts', async (manifest: TemplateData) => {
  const templateId = manifest.id;
  const data: TemplatePayload = {
    manifest: clone(manifest),
    workflows: {},
    parameterDefinitions: {},
    connections: {},
    errors: {
      general: undefined,
      manifest: {},
      parameters: {},
      connections: undefined,
    },
  };

  const workflows = await getWorkflowsInTemplate(templateId);
  const workflowsWithName = Object.keys(workflows).reduce((acc: Record<string, string>, workflowId: string) => {
    acc[workflowId] = workflowId;
    (data.manifest as Template.TemplateManifest).workflows[workflowId] = { name: workflowId };
    return acc;
  }, {});
  const getWorkflowDetailsHandler = async (templateId: string, workflowId: string) => {
    const workflowManifest = workflows[workflowId];
    const workflowDefinition = getDefinitionFromWorkflowManifest(workflowManifest);
    return { workflowManifest, workflowDefinition };
  };

  return loadWorkflowsDataInTemplate(templateId, data, workflowsWithName, /* viewTemplateData */ undefined, getWorkflowDetailsHandler);
});

export const loadManifestsFromPaths = async (templateIds: string[]) => {
  try {
    const manifestPromises = templateIds.map(async (templateId) => {
      return TemplateService().getResourceManifest(templateId);
    });
    const templateManifestsArray = (await Promise.all(manifestPromises)) as Template.TemplateManifest[];
    return templateManifestsArray.reduce((result: Record<string, Template.TemplateManifest>, manifestFile: any, index: number) => {
      result[templateIds[index]] = {
        ...manifestFile,
        details: {
          ...manifestFile.details,
          publishedBy: manifestFile.details?.By,
        },
      };
      return result;
    }, {});
  } catch (error) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'Templates.loadGithubManifests',
      message: `Error loading manifests: ${error}`,
      error: error instanceof Error ? error : undefined,
    });
    return undefined;
  }
};

export const loadTemplate = createAsyncThunk(
  'loadTemplate',
  async (
    { preLoadedManifest, templateName }: { preLoadedManifest: Template.TemplateManifest | undefined; templateName?: string },
    thunkAPI
  ) => {
    if (templateName) {
      return loadTemplateFromResourcePath(templateName, preLoadedManifest);
    }

    const currentState: RootState = thunkAPI.getState() as RootState;
    const currentTemplateName = currentState.template.templateName;
    const viewTemplateDetails = currentState.templateOptions.viewTemplateDetails;
    const viewTemplateData = currentTemplateName === viewTemplateDetails?.id ? viewTemplateDetails : undefined;

    if (currentTemplateName) {
      return loadTemplateFromResourcePath(currentTemplateName, preLoadedManifest, viewTemplateData);
    }

    return undefined;
  }
);

export const validateWorkflowsBasicInfo = createAsyncThunk(
  'validateWorkflowsBasicInfo',
  async (
    { existingWorkflowNames, requireDescription = false }: { existingWorkflowNames: string[]; requireDescription?: boolean },
    thunkAPI
  ) => {
    const state: RootState = thunkAPI.getState() as RootState;
    const { subscriptionId, resourceGroup: resourceGroupName, isConsumption } = state.workflow;
    const { workflows } = state.template;
    const workflowIds = Object.keys(workflows);
    const result: Record<
      string,
      {
        kindError?: string;
        nameError?: string;
        triggerDescriptionError?: string;
      }
    > = {};
    if (workflowIds.length) {
      const intl = getIntl();
      for (const id of workflowIds) {
        if (!workflows[id].kind) {
          result[id] = {
            ...result[id],
            kindError: intl.formatMessage({
              defaultMessage: 'The value must not be empty.',
              id: 'JzvOUc',
              description: 'Error message when the stage progressed without selecting kind.',
            }),
          };
        }

        const currentWorkflowNames = getCurrentWorkflowNames(
          workflowIds.map((id) => ({ id, name: workflows[id].workflowName ?? '' })),
          id
        );
        const nameError = await validateWorkflowName(workflows[id].workflowName, !!isConsumption, {
          subscriptionId,
          resourceGroupName,
          existingWorkflowNames: [...existingWorkflowNames, ...currentWorkflowNames],
        });
        result[id] = {
          ...result[id],
          nameError,
        };

        if (requireDescription) {
          const triggerKey = Object.keys(workflows?.[id]?.workflowDefinition?.triggers ?? {})?.[0];
          const trigger = workflows?.[id]?.workflowDefinition?.triggers?.[triggerKey];
          const triggerDescriptionError = await validateTriggerDescription(trigger?.description);
          if (triggerDescriptionError) {
            result[id] = {
              ...result[id],
              triggerDescriptionError,
            };
          }
        }
      }
    }

    return result;
  }
);

export const validateWorkflowName = async (
  workflowName: string | undefined,
  isConsumption: boolean,
  resourceDetails: {
    subscriptionId: string;
    resourceGroupName: string;
    existingWorkflowNames: string[];
  }
) => {
  const intl = getIntl();
  const { subscriptionId, resourceGroupName, existingWorkflowNames } = resourceDetails;

  if (!workflowName) {
    return intl.formatMessage({
      defaultMessage: 'Must provide value for workflow name.',
      id: 'sKy720',
      description: 'Error message when the workflow name is empty.',
    });
  }

  const regexError = checkWorkflowNameWithRegex(intl, workflowName);
  if (regexError) {
    return regexError;
  }

  const availabilityError = intl.formatMessage(
    {
      defaultMessage: 'Workflow with name "{workflowName}" already exists.',
      id: '7F4Bzv',
      description: 'Error message when the workflow name already exists.',
    },
    { workflowName }
  );

  if (isConsumption) {
    const resourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Logic/workflows/${workflowName}`;
    const isResourceAvailable = await TemplateService().isResourceAvailable?.(resourceId);
    return isResourceAvailable ? undefined : availabilityError;
  }

  if (existingWorkflowNames.includes(workflowName)) {
    return availabilityError;
  }

  return undefined;
};

export const validateTriggerDescription = async (triggerDescription: string | undefined) => {
  const intl = getIntl();
  if (!triggerDescription) {
    return intl.formatMessage({
      defaultMessage: 'Must provide value for description.',
      id: 'OZ42O1',
      description: 'Error message when the description is empty.',
    });
  }
  return undefined;
};

const loadTemplateFromResourcePath = async (
  templateId: string,
  preloadedTemplateManifest: Template.TemplateManifest | undefined,
  viewTemplateData?: Template.ViewTemplateDetails
): Promise<TemplatePayload> => {
  const templateManifest =
    preloadedTemplateManifest ?? ((await TemplateService().getResourceManifest(templateId)) as Template.TemplateManifest);

  const workflows = Object.keys(templateManifest.workflows).reduce((acc: Record<string, string>, workflowId: string) => {
    const workflowName = templateManifest.workflows[workflowId].name;
    acc[workflowId] = workflowName;
    return acc;
  }, {});
  const data: TemplatePayload = {
    manifest: clone(templateManifest),
    workflows: {},
    parameterDefinitions: {},
    connections: {},
    errors: {
      general: undefined,
      manifest: {},
      parameters: {},
      connections: undefined,
    },
  };

  return loadWorkflowsDataInTemplate(templateId, data, workflows, viewTemplateData, getWorkflowAndManifest);
};

type GetWorkflowAndManifestHandler = (
  templateId: string,
  workflowId: string
) => Promise<{ workflowManifest: Template.WorkflowManifest; workflowDefinition: LogicAppsV2.WorkflowDefinition }>;

const loadWorkflowTemplate = async (
  templateId: string,
  workflowId: string,
  viewTemplateData: Template.ViewTemplateDetails | undefined,
  defaultNameInManifest: string,
  getWorkflowAndManifest: GetWorkflowAndManifestHandler
): Promise<
  | {
      workflow: WorkflowTemplateData;
      parameterDefinitions: Record<string, Template.ParameterDefinition>;
      connections: Record<string, Template.Connection>;
    }
  | undefined
> => {
  try {
    const { workflowManifest, workflowDefinition } = await getWorkflowAndManifest(templateId, workflowId);
    const parameterDefinitions = workflowManifest.parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
      result[parameter.name] = {
        ...parameter,
        value: viewTemplateData?.parametersOverride?.[parameter.name]?.value?.toString() ?? parameter.default,
        associatedWorkflows: [workflowManifest.title],
      };
      return result;
    }, {});

    const overridenKind = viewTemplateData?.basicsOverride?.[workflowId]?.kind?.value;

    return {
      workflow: {
        id: workflowId,
        workflowDefinition,
        manifest: clone(workflowManifest),
        workflowName: viewTemplateData?.basicsOverride?.[workflowId]?.name?.value ?? defaultNameInManifest,
        kind:
          overridenKind && workflowManifest.kinds?.includes(overridenKind)
            ? overridenKind
            : workflowManifest.kinds?.length
              ? workflowManifest.kinds[0]
              : 'stateful',
        triggerType: getTriggerFromDefinition(workflowDefinition.triggers ?? {}),
        images: {
          light: TemplateService().getContentPathUrl(`${templateId}/${workflowId}`, workflowManifest.images.light),
          dark: TemplateService().getContentPathUrl(`${templateId}/${workflowId}`, workflowManifest.images.dark),
        },
        connectionKeys: Object.keys(workflowManifest.connections),
        errors: {
          general: undefined,
          workflow: undefined,
          kind: undefined,
        },
      },
      parameterDefinitions,
      connections: workflowManifest.connections,
    };
  } catch (ex: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      message: 'Error loading workflow and manifest',
      area: 'Templates.GithubLoadTemplate',
      error: ex,
      args: [`${templateId}/${workflowId}`],
    });
    return undefined;
  }
};

const getWorkflowAndManifest = async (templateId: string, workflowId: string) => {
  const workflowManifest = (await TemplateService().getResourceManifest(`${templateId}/${workflowId}`)) as Template.WorkflowManifest;
  const workflowDefinition = await TemplateService().getWorkflowDefinition(templateId, workflowId);

  return { workflowManifest, workflowDefinition };
};

const loadWorkflowsDataInTemplate = async (
  templateId: string,
  templateData: TemplatePayload,
  workflows: Record<string, string>,
  viewTemplateData: Template.ViewTemplateDetails | undefined,
  getWorkflowAndManifestCallback: GetWorkflowAndManifestHandler
) => {
  const workflowIds = Object.keys(workflows);
  const isMultiWorkflow = workflowIds.length > 1;
  const templateManifest = templateData.manifest as Template.TemplateManifest;

  for (const workflowId of workflowIds) {
    const workflowData = await loadWorkflowTemplate(
      templateId,
      workflowId,
      viewTemplateData,
      workflows[workflowId],
      getWorkflowAndManifestCallback
    );
    if (workflowData) {
      templateData.workflows[workflowId] = workflowData.workflow;
      // Override title and summary with template manifest data if single workflow
      if (!isMultiWorkflow) {
        templateData.workflows[workflowId].manifest.title = templateManifest.title;
        templateData.workflows[workflowId].manifest.summary = templateManifest.summary;
      }
      templateData.parameterDefinitions = isMultiWorkflow
        ? {
            ...templateData.parameterDefinitions,
            ...Object.keys(workflowData.parameterDefinitions).reduce((acc: Record<string, Template.ParameterDefinition>, key: string) => {
              if (templateData.parameterDefinitions[key] && workflowData.parameterDefinitions[key]) {
                // Combine associatedWorkflows arrays if both definitions exist
                const combinedAssociatedWorkflows = [
                  ...(templateData.parameterDefinitions[key].associatedWorkflows || []),
                  ...(workflowData.parameterDefinitions[key].associatedWorkflows || []),
                ];

                acc[key] = {
                  ...templateData.parameterDefinitions[key],
                  ...workflowData.parameterDefinitions[key],
                  associatedWorkflows: combinedAssociatedWorkflows,
                };
              } else {
                // If the key doesn't exist in data, just take from workflowData
                acc[key] = workflowData.parameterDefinitions[key];
              }
              return acc;
            }, {}),
          }
        : workflowData.parameterDefinitions;
      templateData.connections = { ...templateData.connections, ...workflowData.connections };
    }
  }

  return templateData;
};
