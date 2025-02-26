/* eslint-disable @typescript-eslint/no-empty-function */
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';

export interface CustomTemplateLoadingState {
  resourcePath?: string;
  appId?: string;
  workflowName?: string;
  runId?: string;
  isLocal: boolean;
  theme: ThemeType;
  language: string;
}

const initialState: CustomTemplateLoadingState = {
  appId: undefined,
  isLocal: false,
  theme: ThemeType.Light,
  language: 'en',
};

export const customTemplateLoaderSlice = createSlice({
  name: 'customTemplateLoader',
  initialState,
  reducers: {
    setAppid: (state, action: PayloadAction<string>) => {
      state.appId = action.payload;
    },
    setTemplateResourceName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    changeRunId: (state, action: PayloadAction<string>) => {
      state.runId = action.payload;
    },
    setResourcePath: (state, action: PayloadAction<string>) => {
      state.resourcePath = action.payload;
    },
    clearWorkflowDetails: (state) => {
      state.appId = undefined;
      state.workflowName = undefined;
      state.runId = undefined;
      state.resourcePath = '';
    },
    setLanguage: (state, action: PayloadAction<string | undefined>) => {
      state.language = action.payload ?? 'en';
    },
    setIsLocalSelected: (state, action: PayloadAction<boolean>) => {
      state.isLocal = action.payload;
      state.appId = undefined;
      state.workflowName = undefined;
      state.resourcePath = '';
    },
    changeTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
    },
  },
});

export const {
  setResourcePath,
  setAppid,
  setTemplateResourceName: setWorkflowName,
  clearWorkflowDetails,
  changeRunId,
} = customTemplateLoaderSlice.actions;

export default customTemplateLoaderSlice.reducer;
