import type { LogicAppsV2, Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { templatesPathFromState, type RootState } from './store';

export interface TemplateState {
  templateName?: string;
  workflowDefinition?: LogicAppsV2.WorkflowDefinition;
  manifest?: Template.Manifest;
  connections?: Record<string, Template.Connection>;
  parameters?: Record<string, any>;
}

const initialState: TemplateState = {};

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
      state.workflowDefinition = action.payload?.workflowDefinition;
      state.manifest = action.payload?.manifest;
      state.connections = action.payload?.connections;
      state.parameters = action.payload?.parameters;
    });

    builder.addCase(loadTemplate.rejected, (state) => {
      // TODO change to null for error handling case
      state.workflowDefinition = undefined;
      state.manifest = undefined;
      state.connections = undefined;
      state.parameters = undefined;
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

    return {
      workflowDefinition: (templateWorkflowDefinition as any)?.default ?? templateWorkflowDefinition,
      manifest: templateManifest,
      connections: templateManifest.connections,
      parameters: templateManifest.parameters,
    };
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
};
