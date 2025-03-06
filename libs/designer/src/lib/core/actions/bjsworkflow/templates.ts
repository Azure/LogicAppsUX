import {
  BaseExperimentationService,
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
  InitUiInteractionsService,
  InitWorkflowService,
  LogEntryLevel,
  LoggerService,
  type LogicAppsV2,
  TemplateService,
  type Template,
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../state/templates/store';
import type { TemplateServiceOptions } from '../../templates/TemplatesDesignerContext';
import { initializeParametersMetadata } from '../../templates/utils/parametershelper';
import { initializeNodeOperationInputsData } from '../../state/operation/operationMetadataSlice';
import { updateTemplateParameterDefinitions } from '../../state/templates/templateSlice';
import {
  loadGithubManifestNames,
  setavailableTemplates,
  setavailableTemplatesNames,
  setFilteredTemplateNames,
} from '../../state/templates/manifestSlice';

export interface WorkflowTemplateData {
  id: string;
  workflowDefinition: LogicAppsV2.WorkflowDefinition;
  manifest: Template.WorkflowManifest;
  workflowName: string | undefined;
  kind: string | undefined;
  images?: {
    light?: string;
    dark?: string;
  };
  connectionKeys: string[];
  errors: {
    workflow: string | undefined;
    kind: string | undefined;
  };
}

export interface TemplatePayload {
  manifest: Template.TemplateManifest | undefined;
  workflows: Record<string, WorkflowTemplateData>;
  parameterDefinitions: Record<string, Template.ParameterDefinition>;
  connections: Record<string, Template.Connection>;
  errors: {
    parameters: Record<string, string | undefined>;
    connections: string | undefined;
  };
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
      dispatch(updateTemplateParameterDefinitions(templateParametersToOverride));
    }
  }
);

export const isMultiWorkflowTemplate = (manifest: Template.TemplateManifest): boolean => {
  return Object.keys(manifest.workflows).length > 1;
};

export const initializeTemplateServices = createAsyncThunk(
  'initializeTemplateServices',
  async ({
    connectionService,
    operationManifestService,
    connectorService,
    workflowService,
    oAuthService,
    gatewayService,
    tenantService,
    connectionParameterEditorService,
    templateService,
    loggerService,
    uiInteractionsService,
    experimentationService,
  }: TemplateServiceOptions) => {
    InitConnectionService(connectionService);
    InitOperationManifestService(operationManifestService);
    InitOAuthService(oAuthService);
    InitWorkflowService(workflowService);

    const loggerServices: ILoggerService[] = [];
    if (loggerService) {
      loggerServices.push(loggerService);
    }
    if (process.env.NODE_ENV !== 'production') {
      loggerServices.push(new DevLogger());
    }
    InitLoggerService(loggerServices);

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

    if (uiInteractionsService) {
      InitUiInteractionsService(uiInteractionsService);
    }

    // Experimentation service is being used to A/B test features in the designer so in case client does not want to use the A/B test feature,
    // we are always defaulting to the false implementation of the experimentation service.
    InitExperimentationServiceService(experimentationService ?? new BaseExperimentationService());

    return true;
  }
);

export const reloadTemplates = createAsyncThunk('reloadTemplates', async ({ clear }: { clear?: boolean }, thunkAPI: any) => {
  const dispatch = thunkAPI.dispatch;

  if (clear) {
    dispatch(setavailableTemplatesNames(undefined));
    dispatch(setavailableTemplates(undefined));
    dispatch(setFilteredTemplateNames(undefined));
  }

  dispatch(loadGithubManifestNames());
});

export const loadManifestsFromPaths = async (templateIds: string[]) => {
  try {
    const manifestPromises = templateIds.map(async (templateId) => {
      return TemplateService().getResourceManifest(templateId);
    });
    const templateManifestsArray = (await Promise.all(manifestPromises)) as Template.TemplateManifest[];
    return templateManifestsArray.reduce((result: Record<string, Template.TemplateManifest>, manifestFile: any, index: number) => {
      result[templateIds[index]] = manifestFile;
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
  async ({ preLoadedManifest }: { preLoadedManifest: Template.TemplateManifest | undefined }, thunkAPI) => {
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

export const validateWorkflowName = (workflowName: string | undefined, existingWorkflowNames: string[]) => {
  const intl = getIntl();

  if (!workflowName) {
    return intl.formatMessage({
      defaultMessage: 'Must provide value for workflow name.',
      id: 'sKy720',
      description: 'Error message when the workflow name is empty.',
    });
  }
  const regex = /^[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)*$/;
  if (!regex.test(workflowName)) {
    return intl.formatMessage({
      defaultMessage: 'Name does not match the given pattern.',
      id: 'zMKxg9',
      description: 'Error message when the workflow name is invalid regex.',
    });
  }
  if (existingWorkflowNames.includes(workflowName)) {
    return intl.formatMessage(
      {
        defaultMessage: 'Workflow with name "{workflowName}" already exists.',
        id: '7F4Bzv',
        description: 'Error message when the workflow name already exists.',
      },
      { workflowName }
    );
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

  const workflows = templateManifest.workflows;
  const isMultiWorkflow = isMultiWorkflowTemplate(templateManifest);
  const data: TemplatePayload = {
    manifest: templateManifest,
    workflows: {},
    parameterDefinitions: {},
    connections: {},
    errors: {
      parameters: {},
      connections: undefined,
    },
  };

  if (isMultiWorkflow && workflows) {
    for (const workflowId of Object.keys(workflows)) {
      const workflowData = await loadWorkflowTemplate(templateId, workflowId, viewTemplateData);

      if (workflowData) {
        workflowData.workflow.workflowName = workflows[workflowId].name;
        data.workflows[workflowId] = workflowData.workflow;
        data.parameterDefinitions = {
          ...data.parameterDefinitions,
          ...Object.keys(workflowData.parameterDefinitions).reduce((acc: Record<string, Template.ParameterDefinition>, key: string) => {
            if (data.parameterDefinitions[key] && workflowData.parameterDefinitions[key]) {
              // Combine associatedWorkflows arrays if both definitions exist
              const combinedAssociatedWorkflows = [
                ...(data.parameterDefinitions[key].associatedWorkflows || []),
                ...(workflowData.parameterDefinitions[key].associatedWorkflows || []),
              ];

              acc[key] = {
                ...data.parameterDefinitions[key],
                ...workflowData.parameterDefinitions[key],
                associatedWorkflows: combinedAssociatedWorkflows,
              };
            } else {
              // If the key doesn't exist in data, just take from workflowData
              acc[key] = workflowData.parameterDefinitions[key];
            }
            return acc;
          }, {}),
        };
        data.connections = { ...data.connections, ...workflowData.connections };
      }
    }
  } else {
    const workflowId = 'default';
    const workflowData = await loadWorkflowTemplate(templateId, workflowId, viewTemplateData);

    if (workflowData) {
      data.workflows = {
        [workflowId]: {
          ...workflowData.workflow,
          manifest: {
            ...workflowData.workflow.manifest,
            // Override title and summary with template manifest data if single workflow
            title: templateManifest.title,
            summary: templateManifest.summary,
          },
        },
      };
      data.parameterDefinitions = workflowData.parameterDefinitions;
      data.connections = workflowData.connections;
    }
  }

  return data;
};

const loadWorkflowTemplate = async (
  templateId: string,
  workflowId: string,
  viewTemplateData: Template.ViewTemplateDetails | undefined
): Promise<
  | {
      workflow: WorkflowTemplateData;
      parameterDefinitions: Record<string, Template.ParameterDefinition>;
      connections: Record<string, Template.Connection>;
    }
  | undefined
> => {
  try {
    const { workflowManifest, templateWorkflowDefinition } = await getWorkflowAndManifest(templateId, workflowId);
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
        workflowDefinition: templateWorkflowDefinition,
        manifest: workflowManifest,
        workflowName: viewTemplateData?.basicsOverride?.[workflowId]?.name?.value ?? '',
        kind:
          overridenKind && workflowManifest.kinds?.includes(overridenKind)
            ? overridenKind
            : workflowManifest.kinds?.length
              ? workflowManifest.kinds[0]
              : 'stateful',
        images: {
          light: TemplateService().getContentPathUrl(`${templateId}/${workflowId}`, workflowManifest.images.light),
          dark: TemplateService().getContentPathUrl(`${templateId}/${workflowId}`, workflowManifest.images.dark),
        },
        connectionKeys: Object.keys(workflowManifest.connections),
        errors: {
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
  const templateWorkflowDefinition = await TemplateService().getWorkflowDefinition(templateId, workflowId);

  return { workflowManifest, templateWorkflowDefinition };
};
