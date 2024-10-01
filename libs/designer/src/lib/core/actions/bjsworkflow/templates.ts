import {
  DevLogger,
  guid,
  type ILoggerService,
  InitApiManagementService,
  InitAppServiceService,
  InitConnectionParameterEditorService,
  InitConnectionService,
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
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../state/templates/store';
import type { TemplateServiceOptions } from '../../templates/TemplatesDesignerContext';

export interface WorkflowTemplateData {
  id: string;
  workflowDefinition: LogicAppsV2.WorkflowDefinition | undefined;
  manifest: Template.Manifest | undefined;
  workflowName: string | undefined;
  kind: string | undefined;
  images?: Record<string, string>;
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

    return true;
  }
);

export const loadTemplate = createAsyncThunk('loadTemplate', async (preLoadedManifest: Template.Manifest | undefined, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const currentTemplateResourcePath = currentState.template.templateName;

  if (currentTemplateResourcePath) {
    return loadTemplateFromResourcePath(currentTemplateResourcePath, preLoadedManifest);
  }

  return undefined;
});

const loadTemplateFromResourcePath = async (templateName: string, manifest: Template.Manifest | undefined): Promise<TemplatePayload> => {
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
        /* manifest */ undefined
      );
      if (workflowData) {
        workflowData.workflow.workflowName = workflows[workflowPath].name;
        data.workflows[workflowPath] = workflowData.workflow;
        data.parameterDefinitions = { ...data.parameterDefinitions, ...workflowData.parameterDefinitions };
        data.connections = { ...data.connections, ...workflowData.connections };
      }
    }
  } else {
    const workflowId = guid();
    const workflowData = await loadWorkflowTemplateFromManifest(workflowId, templateName, manifest);
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
  manifest: Template.Manifest | undefined
): Promise<
  | {
      workflow: WorkflowTemplateData;
      parameterDefinitions: Record<string, Template.ParameterDefinition>;
      connections: Record<string, Template.Connection>;
    }
  | undefined
> => {
  try {
    const { templateManifest, templateWorkflowDefinition } = await getWorkflowAndManifest(templatePath, manifest);
    const parameterDefinitions = templateManifest.parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
      result[parameter.name] = {
        ...parameter,
        value: parameter.default,
      };
      return result;
    }, {});

    return {
      workflow: {
        id: workflowId,
        workflowDefinition: (templateWorkflowDefinition as any)?.default ?? templateWorkflowDefinition,
        manifest: templateManifest,
        workflowName: '',
        kind: templateManifest.kinds?.length ? templateManifest.kinds[0] : 'stateful',
        images: templateManifest.images,
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

const getWorkflowAndManifest = async (templatePath: string, manifest: Template.Manifest | undefined) => {
  const paths = templatePath.split('/');
  const templateManifest: Template.Manifest =
    manifest ?? paths.length === 2
      ? (await import(`./../../templates/templateFiles/${paths[0]}/${paths[1]}/manifest.json`)).default
      : (await import(`./../../templates/templateFiles/${templatePath}/manifest.json`)).default;

  const templateWorkflowDefinition: LogicAppsV2.WorkflowDefinition =
    paths.length === 2
      ? (await import(`./../../templates/templateFiles/${paths[0]}/${paths[1]}/workflow.json`)).default
      : (await import(`./../../templates/templateFiles/${templatePath}/workflow.json`)).default;

  return { templateManifest, templateWorkflowDefinition };
};
