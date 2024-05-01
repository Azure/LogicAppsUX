import type { PayloadAction } from '@reduxjs/toolkit';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';

//TODO: This file is deprecated; move data loader into library
export const LoadingMethod = {
  File: 'file',
  Arm: 'arm',
} as const;
export type LoadingMethod = (typeof LoadingMethod)[keyof typeof LoadingMethod];

export interface SchemaLoadingState {
  theme: ThemeType;
  armToken?: string;
  loadingMethod: LoadingMethod;
  currentTemplateResourcePath?: string;
  currentTemplate?: any;
  availableResourcesPaths?: string[];
  // availableSchemas?: DataMapSchema[];
}

const initialState: SchemaLoadingState = {
  theme: ThemeType.Light,
  loadingMethod: LoadingMethod.File,
  currentTemplateResourcePath: '',
};

export const templateDataLoaderSlice = createSlice({
  name: 'templateDataLoader',
  initialState,
  reducers: {
    changeTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
    },
    changeArmToken: (state, action: PayloadAction<string>) => {
      state.armToken = action.payload;
    },
    changecurrentTemplateResourcePath: (state, action: PayloadAction<string>) => {
      state.currentTemplateResourcePath = action.payload;
    },
    changeAvailableResourcesPath: (state, action: PayloadAction<string[]>) => {
      state.availableResourcesPaths = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<LoadingMethod>) => {
      state.loadingMethod = action.payload;
    },
  },
});
