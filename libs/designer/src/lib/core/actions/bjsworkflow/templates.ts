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
  name?: string;
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
  workflows: Record<string, WorkflowTemplateData>;
  parameterDefinitions: Record<string, Template.ParameterDefinition>;
  connections: Record<string, Template.Connection>;
  errors: {
    parameters: Record<string, string | undefined>;
    connections: string | undefined;
  };
}

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
  const isMultiWorkflowTemplate = workflows && Object.keys(workflows).length > 0;
  const data: TemplatePayload = {
    workflows: {},
    parameterDefinitions: {},
    connections: {},
    errors: {
      parameters: {},
      connections: undefined,
    },
  };

  if (isMultiWorkflowTemplate) {
    for (const workflowPath in Object.keys(workflows)) {
      const workflowName = workflows[workflowPath].name;
      const workflowData = await loadWorkflowTemplateFromManifest(`${templateName}/${workflowPath}`, /* manifest */ undefined);
      if (workflowData) {
        workflowData.workflow.workflowName = workflowName;
        data.workflows[workflowName] = workflowData.workflow;
        data.parameterDefinitions = { ...data.parameterDefinitions, ...workflowData.parameterDefinitions };
        data.connections = { ...data.connections, ...workflowData.connections };
      }
    }
  } else {
    const workflowData = await loadWorkflowTemplateFromManifest(templateName, manifest);
    if (workflowData) {
      data.workflows = {
        [guid()]: workflowData.workflow,
      };
      data.parameterDefinitions = workflowData.parameterDefinitions;
      data.connections = workflowData.connections;
    }
  }

  return data;
};

const loadWorkflowTemplateFromManifest = async (
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
    const templateWorkflowDefinition: LogicAppsV2.WorkflowDefinition = await import(
      `./../../templates/templateFiles/${templatePath}/workflow.json`
    );

    const templateManifest: Template.Manifest =
      manifest ?? (await import(`./../../templates/templateFiles/${templatePath}/manifest.json`)).default;

    const parameterDefinitions = templateManifest.parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
      result[parameter.name] = {
        ...parameter,
        value: parameter.default,
      };
      return result;
    }, {});

    return {
      workflow: {
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
