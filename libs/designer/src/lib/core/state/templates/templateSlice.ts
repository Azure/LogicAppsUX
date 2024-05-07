import type { LogicAppsV2, Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { templatesPathFromState, type RootState } from './store';

export interface TemplateParameterDefinition extends Template.Parameter {
  value?: any;
}

export interface TemplateState {
  templateName?: string;
  workflowDefinition: LogicAppsV2.WorkflowDefinition | undefined;
  manifest: Template.Manifest | undefined;
  parameters: {
    definitions: Record<string, Template.Parameter>;
    validationErrors: Record<string, string | undefined>;
  };
  connections: Template.Connection[];
}

const initialState: TemplateState = {
  workflowDefinition: undefined,
  manifest: undefined,
  parameters: {
    definitions: {},
    validationErrors: {},
  },
  connections: [],
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

export const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    changeCurrentTemplateName: (state, action: PayloadAction<string>) => {
      state.templateName = action.payload;
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
      state.connections = [];
    });
  },
});

export const { changeCurrentTemplateName } = templateSlice.actions;

const loadTemplateFromGithub = async (
  templateName: string,
  manifest: Template.Manifest | undefined
): Promise<TemplateState | undefined> => {
  try {
    const templateWorkflowDefinition: LogicAppsV2.WorkflowDefinition = await import(
      `${templatesPathFromState}/${templateName}/workflow.json`
    );

    const templateManifest: Template.Manifest =
      manifest ?? (await import(`${templatesPathFromState}/${templateName}/manifest.json`)).default;
    const parametersDefinitions = templateManifest.parameters?.reduce((result: Record<string, TemplateParameterDefinition>, parameter) => {
      result[parameter.name] = parameter;
      return result;
    }, {});

    return {
      workflowDefinition: (templateWorkflowDefinition as any)?.default ?? templateWorkflowDefinition,
      manifest: templateManifest,
      parameters: {
        definitions: parametersDefinitions,
        validationErrors: {},
      },
      connections: templateManifest.connections,
    };
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
};
