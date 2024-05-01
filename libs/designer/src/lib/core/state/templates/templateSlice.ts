import type { LogicAppsV2, Manifest, TemplateConnection } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { templatesPathFromState, type RootState } from './store';

export interface TemplateState {
  templateName?: string;
  workflowDefinition?: LogicAppsV2.WorkflowDefinition;
  manifest?: Manifest;
  connections?: Record<string, TemplateConnection>;
  parameters?: Record<string, any>;
}

const initialState: TemplateState = {};

export const loadTemplate = createAsyncThunk('template/loadTemplate', async (_: unknown, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const currentTemplateResourcePath = currentState.template.templateName;

  if (currentTemplateResourcePath) {
    return loadTemplateFromGithub(currentTemplateResourcePath);
  }

  return undefined;
});

export const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    changeCurrentTemplateName: (state, action: PayloadAction<string>) => {
      state.templateName = action.payload;
    },
    changeCurrentTemplateManifest: (state, action: PayloadAction<Manifest>) => {
      state.manifest = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadTemplate.fulfilled, (state, action) => {
      state.workflowDefinition = action.payload?.workflowDefinition;
    });

    builder.addCase(loadTemplate.rejected, (state) => {
      // TODO change to null for error handling case
      state.workflowDefinition = undefined;
    });
  },
});

export const { changeCurrentTemplateName, changeCurrentTemplateManifest } = templateSlice.actions;

const loadTemplateFromGithub = async (manifestName: string): Promise<TemplateState | undefined> => {
  try {
    const templateWorkflowDefinition: LogicAppsV2.WorkflowDefinition = await import(`${templatesPathFromState}/workflow.json`);

    return {
      workflowDefinition: templateWorkflowDefinition,
    };
  } catch (ex) {
    console.error(ex, manifestName);
    return undefined;
  }
};
