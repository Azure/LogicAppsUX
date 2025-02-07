import {
  BaseExperimentationService,
  DevLogger,
  getIntl,
  type ILoggerService,
  InitApiManagementService,
  InitAppServiceService,
  InitConnectionParameterEditorService,
  InitConnectionService,
  InitExperimentationServiceService,
  InitFunctionService,
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
  type Template,
  TemplateService,
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../state/templates/store';
import type { TemplateServiceOptions } from '../../templates/TemplatesDesignerContext';

export interface WorkflowTemplateData {
  id: string;
  workflowDefinition: LogicAppsV2.WorkflowDefinition;
  manifest: Template.Manifest;
  workflowName: string | undefined;
  kind: string | undefined;
  images?: Record<string, string>;
  connectionKeys: string[];
  errors: {
    workflow: string | undefined;
    kind: string | undefined;
  };
}

export interface TemplatePayload {
  manifest: Template.Manifest | undefined;
  workflows: Record<string, WorkflowTemplateData>;
  parameterDefinitions: Record<string, Template.ParameterDefinition>;
  connections: Record<string, Template.Connection>;
  errors: {
    parameters: Record<string, string | undefined>;
    connections: string | undefined;
  };
}

export const isMultiWorkflowTemplate = (manifest: Template.Manifest): boolean => {
  return !!manifest.workflows && Object.keys(manifest.workflows).length > 0;
};

export const initializeTemplateServices = createAsyncThunk(
  'initializeTemplateServices',
  async ({
    connectionService,
    operationManifestService,
    workflowService,
    oAuthService,
    gatewayService,
    tenantService,
    apimService,
    functionService,
    appServiceService,
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

    if (gatewayService) {
      InitGatewayService(gatewayService);
    }
    if (tenantService) {
      InitTenantService(tenantService);
    }
    if (apimService) {
      InitApiManagementService(apimService);
    }
    if (functionService) {
      InitFunctionService(functionService);
    }
    if (appServiceService) {
      InitAppServiceService(appServiceService);
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

export const loadTemplate = createAsyncThunk(
  'loadTemplate',
  async (
    {
      preLoadedManifest,
      viewTemplateDetails,
      isCustomTemplate = false,
    }: { preLoadedManifest: Template.Manifest | undefined; viewTemplateDetails?: Template.ViewTemplateDetails; isCustomTemplate?: boolean },
    thunkAPI
  ) => {
    const currentState: RootState = thunkAPI.getState() as RootState;
    const currentTemplateName = currentState.template.templateName;
    const viewTemplateData = currentTemplateName === viewTemplateDetails?.id ? viewTemplateDetails : undefined;

    if (currentTemplateName) {
      return await loadTemplateFromResourcePath(currentTemplateName, preLoadedManifest, isCustomTemplate, viewTemplateData);
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
  templateName: string,
  manifest: Template.Manifest | undefined,
  isCustomTemplate: boolean,
  viewTemplateData?: Template.ViewTemplateDetails
): Promise<TemplatePayload> => {
  const templateManifest: Template.Manifest =
    manifest ?? (await import(`./../../templates/templateFiles/${templateName}/manifest.json`)).default;

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
    for (const workflowPath of Object.keys(workflows)) {
      const workflowData = await loadWorkflowTemplateFromManifest(
        workflowPath,
        `${templateName}/${workflowPath}`,
        /* manifest */ undefined,
        isCustomTemplate,
        viewTemplateData
      );
      if (workflowData) {
        workflowData.workflow.workflowName = workflows[workflowPath].name;
        data.workflows[workflowPath] = workflowData.workflow;
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
    const workflowId = templateName;
    const workflowData = await loadWorkflowTemplateFromManifest(workflowId, templateName, manifest, isCustomTemplate, viewTemplateData);

    if (workflowData) {
      data.workflows = {
        [workflowId]: workflowData.workflow,
      };
      data.parameterDefinitions = workflowData.parameterDefinitions;
      data.connections = workflowData.connections;
    }
  }

  return data;
};

const loadWorkflowTemplateFromManifest = async (
  workflowId: string,
  templatePath: string,
  manifest: Template.Manifest | undefined,
  isCustomTemplate: boolean,
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
    const { templateManifest, templateWorkflowDefinition } = await getWorkflowAndManifest(templatePath, manifest, isCustomTemplate);
    const parameterDefinitions = templateManifest.parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
      const viewTemplateParameterData = viewTemplateData?.parametersOverride?.[parameter.name];

      result[parameter.name] = {
        ...parameter,
        value: viewTemplateParameterData ? viewTemplateParameterData.value : parameter.default,
        associatedWorkflows: [templateManifest.title],
      };
      return result;
    }, {});

    return {
      workflow: {
        id: workflowId,
        workflowDefinition: (templateWorkflowDefinition as any)?.default ?? templateWorkflowDefinition,
        manifest: templateManifest,
        workflowName: viewTemplateData?.basicsOverride?.[workflowId]?.name?.value ?? '',
        kind:
          viewTemplateData?.basicsOverride?.[workflowId]?.kind?.value ??
          (templateManifest.kinds?.length ? templateManifest.kinds[0] : 'stateful'),
        images: templateManifest.images,
        connectionKeys: Object.keys(templateManifest.connections),
        errors: {
          workflow: undefined,
          kind: undefined,
        },
      },
      parameterDefinitions,
      connections: templateManifest.connections,
    };
  } catch (ex: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      message: 'Error loading template',
      area: 'Templates.GithubLoadTemplate',
      error: ex,
      args: [templatePath],
    });
    return undefined;
  }
};

const getWorkflowAndManifest = async (templatePath: string, manifest: Template.Manifest | undefined, isCustomTemplate: boolean) => {
  const templateManifest: Template.Manifest = manifest ?? (await getTemplateResourceGivenPath(templatePath, 'manifest', isCustomTemplate));

  const templateWorkflowDefinition: LogicAppsV2.WorkflowDefinition = await getTemplateResourceGivenPath(
    templatePath,
    'workflow',
    isCustomTemplate
  );

  return { templateManifest, templateWorkflowDefinition };
};

const getTemplateResourceGivenPath = async (resourcePath: string, artifactType: string, isCustomTemplate: boolean) => {
  if (isCustomTemplate) {
    return await TemplateService()?.getCustomResource?.(resourcePath, artifactType);
  }
  const paths = resourcePath.split('/');

  return paths.length === 2
    ? (await import(`./../../templates/templateFiles/${paths[0]}/${paths[1]}/${artifactType}.json`)).default
    : (await import(`./../../templates/templateFiles/${resourcePath}/${artifactType}.json`)).default;
};
