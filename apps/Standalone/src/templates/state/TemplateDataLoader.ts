import type { RootState } from './Store';
import type { Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

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
  currentTemplate?: Template;
  availableResourcesPaths?: string[];
  // availableSchemas?: DataMapSchema[];
}

const initialState: SchemaLoadingState = {
  theme: ThemeType.Light,
  loadingMethod: LoadingMethod.File,
  currentTemplateResourcePath: '',
};

export const loadCurrentTemplate = createAsyncThunk('templateDataLoader/loadCurrentTemplate', async (_: unknown, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const currentTemplateResourcePath = currentState.templateDataLoader.currentTemplateResourcePath;

  // TODO ARM loading
  if (currentState.templateDataLoader.loadingMethod === LoadingMethod.Arm) {
    return undefined;
  }
  if (currentTemplateResourcePath) {
    return loadTemplateFromMock(currentTemplateResourcePath);
  }

  return undefined;
});

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
  extraReducers: (builder) => {
    builder.addCase(loadCurrentTemplate.fulfilled, (state, action) => {
      state.currentTemplate = action.payload;
    });

    builder.addCase(loadCurrentTemplate.rejected, (state) => {
      // TODO change to null for error handling case
      state.currentTemplate = undefined;
    });
  },
});

const loadTemplateFromMock = async (resourcePath: string): Promise<Template | undefined> => {
  try {
    const template: Template = await import(`../__mocks__/${resourcePath}/template.json`);
    return (template as any)?.default ?? template;
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
};
