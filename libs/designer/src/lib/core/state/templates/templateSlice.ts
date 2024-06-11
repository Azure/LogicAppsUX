import { getIntl, getRecordEntry, InitConnectionService, type LogicAppsV2, type Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { templatesPathFromState, type RootState } from './store';
import type { WorkflowParameterUpdateEvent } from '@microsoft/designer-ui';
import { validateParameterValueWithSwaggerType } from '../../../core/utils/validation';
import type { ServiceOptions } from '../designerOptions/designerOptionsInterfaces';

export interface TemplateState {
  templateName?: string;
  workflowDefinition: LogicAppsV2.WorkflowDefinition | undefined;
  manifest: Template.Manifest | undefined;
  workflowName: string | undefined;
  kind: string | undefined;
  parameters: {
    definitions: Record<string, Template.ParameterDefinition>;
    validationErrors: Record<string, string | undefined>;
  };
  connections: Record<string, Template.Connection>;
  initializeTemplateServices: boolean | undefined;
}

const initialState: TemplateState = {
  workflowDefinition: undefined,
  manifest: undefined,
  workflowName: undefined,
  kind: undefined,
  parameters: {
    definitions: {},
    validationErrors: {},
  },
  connections: {},
  initializeTemplateServices: undefined,
};

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

export const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    changeCurrentTemplateName: (state, action: PayloadAction<string>) => {
      state.templateName = action.payload;
    },
    updateWorkflowName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    updateKind: (state, action: PayloadAction<string>) => {
      state.kind = action.payload;
    },
    updateTemplateParameterValue: (state, action: PayloadAction<WorkflowParameterUpdateEvent>) => {
      const {
        id,
        newDefinition: { type, value, required },
      } = action.payload;

      const validationError = validateParameterValue({ type, value }, required);

      state.parameters.definitions[id] = {
        ...(getRecordEntry(state.parameters.definitions, id) ?? ({} as any)),
        value,
      };
      state.parameters.validationErrors[id] = validationError;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadTemplate.fulfilled, (state, action) => {
      if (action.payload) {
        state.workflowDefinition = action.payload.workflowDefinition;
        state.manifest = action.payload.manifest;
        state.parameters = action.payload.parameters;
        state.connections = action.payload.connections;
      }
    });

    builder.addCase(loadTemplate.rejected, (state) => {
      // TODO change to null for error handling case
      state.workflowDefinition = undefined;
      state.manifest = undefined;
      state.parameters = {
        definitions: {},
        validationErrors: {},
      };
      state.connections = {};
    });

    builder.addCase(initializeTemplateServices.fulfilled, (state, action) => {
      state.initializeTemplateServices = action.payload;
    });
  },
});

export const { changeCurrentTemplateName, updateWorkflowName, updateKind, updateTemplateParameterValue } = templateSlice.actions;
export default templateSlice.reducer;

const loadTemplateFromGithub = async (
  templateName: string,
  manifest: Template.Manifest | undefined
): Promise<TemplateState | undefined> => {
  try {
    const templateWorkflowDefinition: LogicAppsV2.WorkflowDefinition = await import(
      /* @vite-ignore */
      `${templatesPathFromState}/${templateName}/workflow.json`
    );

    const templateManifest: Template.Manifest =
      manifest ?? (await import(/* @vite-ignore */ `${templatesPathFromState}/${templateName}/manifest.json`)).default;
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
      kind: templateManifest.kinds.length === 1 ? templateManifest.kinds[0] : undefined,
      parameters: {
        definitions: parametersDefinitions,
        validationErrors: {},
      },
      connections: templateManifest.connections,
      initializeTemplateServices: undefined,
    };
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
};

export const initializeTemplateServices = createAsyncThunk('initializeTemplateServices', async ({ connectionService }: ServiceOptions) => {
  InitConnectionService(connectionService);

  // if (connectorService) {
  //   InitConnectorService(connectorService);
  // }

  return true;
});
