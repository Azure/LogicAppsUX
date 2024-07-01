import {
  InitApiManagementService,
  InitAppServiceService,
  InitConnectionParameterEditorService,
  InitConnectionService,
  InitFunctionService,
  InitGatewayService,
  InitTenantService,
  InitOAuthService,
  getIntl,
  getRecordEntry,
  type LogicAppsV2,
  type Template,
  InitTemplateService,
  InitWorkflowService,
  type ILoggerService,
  DevLogger,
  InitLoggerService,
} from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { templatesPathFromState, type RootState } from './store';
import type { TemplatesParameterUpdateEvent } from '@microsoft/designer-ui';
import { validateParameterValueWithSwaggerType } from '../../../core/utils/validation';
import type { TemplateServiceOptions } from '../../../core/templates/TemplatesDesignerContext';

interface TemplateData {
  workflowDefinition: LogicAppsV2.WorkflowDefinition | undefined;
  manifest: Template.Manifest | undefined;
  workflowName: string | undefined;
  kind: string | undefined;
  parameterDefinitions: Record<string, Template.ParameterDefinition>;
  connections: Record<string, Template.Connection>;
  images?: Record<string, any>;
  errors: {
    workflow: string | undefined;
    kind: string | undefined;
    parameters: Record<string, string | undefined>;
    connections: Record<string, string | undefined>;
  };
}

export interface TemplateState extends TemplateData {
  templateName?: string;
  servicesInitialized: boolean;
}

const initialState: TemplateState = {
  workflowDefinition: undefined,
  manifest: undefined,
  workflowName: undefined,
  kind: undefined,
  parameterDefinitions: {},
  connections: {},
  servicesInitialized: false,
  images: {},
  errors: {
    workflow: undefined,
    kind: undefined,
    parameters: {},
    connections: {},
  },
};

export const initializeTemplateServices = createAsyncThunk(
  'initializeTemplateServices',
  async ({
    connectionService,
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
  }: TemplateServiceOptions) => {
    InitConnectionService(connectionService);
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

    return true;
  }
);

export const loadTemplate = createAsyncThunk(
  'template/loadTemplate',
  async (preLoadedManifest: Template.Manifest | undefined, thunkAPI) => {
    const currentState: RootState = thunkAPI.getState() as RootState;
    const currentTemplateResourcePath = currentState.template.templateName;

    if (currentTemplateResourcePath) {
      return loadTemplateFromGithub(currentTemplateResourcePath, preLoadedManifest);
    }

    return undefined;
  }
);

export const validateParameterValue = (data: { type: string; value?: string }, required = true): string | undefined => {
  const intl = getIntl();

  const { value: valueToValidate, type } = data;

  if (valueToValidate === '' || valueToValidate === undefined) {
    if (!required) {
      return undefined;
    }
    return intl.formatMessage({
      defaultMessage: 'Must provide value for parameter.',
      id: 'VL9wOu',
      description: 'Error message when the workflow parameter value is empty.',
    });
  }

  return validateParameterValueWithSwaggerType(type, valueToValidate, required, intl);
};

export const _validateWorkflowName = (workflowName: string | undefined, existingWorkflowNames: string[]) => {
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

export const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    changeCurrentTemplateName: (state, action: PayloadAction<string>) => {
      state.templateName = action.payload;
    },
    updateWorkflowName: (state, action: PayloadAction<string | undefined>) => {
      state.workflowName = action.payload;
    },
    validateWorkflowName: (state, action: PayloadAction<string[]>) => {
      const validationError = _validateWorkflowName(state.workflowName, action.payload);
      state.errors.workflow = validationError;
    },
    updateKind: (state, action: PayloadAction<string>) => {
      state.kind = action.payload;
      state.errors.kind = undefined;
    },
    validateKind: (state) => {
      if (!state.kind) {
        const intl = getIntl();
        state.errors.kind = intl.formatMessage({
          defaultMessage: 'The value must not be empty.',
          id: 'JzvOUc',
          description: 'Error message when the stage progressed without selecting kind.',
        });
      }
    },
    updateTemplateParameterValue: (state, action: PayloadAction<TemplatesParameterUpdateEvent>) => {
      const {
        newDefinition: { name, type, value, required },
      } = action.payload;

      const validationError = validateParameterValue({ type, value: value }, required);

      state.parameterDefinitions[name] = {
        ...(getRecordEntry(state.parameterDefinitions, name) ?? ({} as any)),
        value,
      };
      state.errors.parameters[name] = validationError;
    },
    validateParameters: (state) => {
      const parametersDefinition = { ...state.parameterDefinitions };
      const parametersValidationErrors = { ...state.errors.parameters };
      Object.keys(parametersDefinition).forEach((parameterName) => {
        const thisParameter = parametersDefinition[parameterName];
        parametersValidationErrors[parameterName] = validateParameterValue(
          { type: thisParameter.type, value: thisParameter.value },
          thisParameter.required
        );
      });
      state.errors.parameters = parametersValidationErrors;
    },
    // validateConnections: (state) => {
    //   if (state.manifest?.connections) {
    //     validateConnections(state.manifest?.connections, state.connections);
    //   }
    // },
    clearTemplateDetails: (state) => {
      state.workflowDefinition = undefined;
      state.manifest = undefined;
      state.workflowName = undefined;
      state.kind = undefined;
      state.parameterDefinitions = {};
      state.connections = {};
      state.errors = {
        workflow: undefined,
        kind: undefined,
        parameters: {},
        connections: {},
      };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadTemplate.fulfilled, (state, action) => {
      if (action.payload) {
        state.workflowDefinition = action.payload.workflowDefinition;
        state.manifest = action.payload.manifest;
        state.parameterDefinitions = action.payload.parameterDefinitions;
        state.connections = action.payload.connections;
        state.images = action.payload.images;
      }
    });

    builder.addCase(loadTemplate.rejected, (state) => {
      // TODO change to null for error handling case
      state.workflowDefinition = undefined;
      state.manifest = undefined;
      state.parameterDefinitions = {};
      state.connections = {};
    });

    builder.addCase(initializeTemplateServices.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
  },
});

export const {
  changeCurrentTemplateName,
  updateWorkflowName,
  validateWorkflowName,
  updateKind,
  validateKind,
  updateTemplateParameterValue,
  validateParameters,
  clearTemplateDetails,
} = templateSlice.actions;
export default templateSlice.reducer;

const loadTemplateFromGithub = async (templateName: string, manifest: Template.Manifest | undefined): Promise<TemplateData | undefined> => {
  try {
    const templateWorkflowDefinition: LogicAppsV2.WorkflowDefinition = await import(
      `${templatesPathFromState}/${templateName}/workflow.json`
    );

    const templateManifest: Template.Manifest =
      manifest ?? (await import(`${templatesPathFromState}/${templateName}/manifest.json`)).default;

    const images: Record<string, any> = {};
    for (const key of Object.keys(templateManifest.images)) {
      images[key] = (await import(`${templatesPathFromState}/${templateName}/${templateManifest.images[key]}`)).default;
    }

    const parametersDefinitions = templateManifest.parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
      result[parameter.name] = {
        ...parameter,
        value: parameter.default,
      };
      return result;
    }, {});

    return {
      workflowDefinition: (templateWorkflowDefinition as any)?.default ?? templateWorkflowDefinition,
      manifest: templateManifest,
      workflowName: templateManifest.title,
      kind: templateManifest.kinds?.length === 1 ? templateManifest.kinds[0] : undefined,
      parameterDefinitions: parametersDefinitions,
      connections: templateManifest.connections,
      images,
      errors: {
        workflow: undefined,
        kind: undefined,
        parameters: {},
        connections: {},
      },
    };
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
};
