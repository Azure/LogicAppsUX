/* eslint-disable @typescript-eslint/no-empty-function */
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';

export interface ConfigureTemplateLoadingState {
  resourcePath?: string;
  isLocal: boolean;
  theme: ThemeType;
  language: string;
}

const initialState: ConfigureTemplateLoadingState = {
  isLocal: false,
  theme: ThemeType.Light,
  language: 'en',
};

export const configureTemplateLoaderSlice = createSlice({
  name: 'configureTemplateLoader',
  initialState,
  reducers: {
    setResourcePath: (state, action: PayloadAction<string>) => {
      state.resourcePath = action.payload;
    },
    clearResourceDetails: (state) => {
      state.resourcePath = '';
    },
    setLanguage: (state, action: PayloadAction<string | undefined>) => {
      state.language = action.payload ?? 'en';
    },
    setIsLocalSelected: (state, action: PayloadAction<boolean>) => {
      state.isLocal = action.payload;
      state.resourcePath = '';
    },
    changeTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
    },
  },
});

export const { setResourcePath, clearResourceDetails, setLanguage, setIsLocalSelected, changeTheme } = configureTemplateLoaderSlice.actions;

export default configureTemplateLoaderSlice.reducer;
