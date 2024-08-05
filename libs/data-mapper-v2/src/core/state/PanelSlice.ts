import { SchemaType } from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';
import type { SchemaFile } from '../../models/Schema';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { TestMapResponse } from '../services/dataMapperApiService';

export const ConfigPanelView = {
  DefaultConfig: 'defaultConfig',
  AddSchema: 'addSchema',
  UpdateSchema: 'updateSchema',
} as const;
export type ConfigPanelView = (typeof ConfigPanelView)[keyof typeof ConfigPanelView];

export type TestPanelState = {
  isOpen: boolean;
  showSelection: boolean;
  selectedFile?: SchemaFile;
  testMapInput?: string;
  testMapOutput?: TestMapResponse;
  testMapOutputError?: Error;
};

export type CodeViewState = {
  isOpen: boolean;
};

export interface PanelState {
  currentPanelView?: ConfigPanelView;
  schemaType?: SchemaType;
  testPanel: TestPanelState;
  codeViewPanel: CodeViewState;
}

export interface TestMapOutput {
  response?: TestMapResponse;
  error?: Error;
}

const initialState: PanelState = {
  currentPanelView: ConfigPanelView.AddSchema,
  codeViewPanel: {
    isOpen: false,
  },
  testPanel: {
    isOpen: false,
    showSelection: true,
  },
};

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    // Also used onClickBackBtn
    openDefaultConfigPanelView: (state) => {
      state.schemaType = undefined;
      state.currentPanelView = ConfigPanelView.DefaultConfig;
    },

    toggleCodeView: (state) => {
      // Close test panel first if code view needs to open
      if (!state.codeViewPanel.isOpen && state.testPanel.isOpen) {
        state.testPanel.isOpen = false;
      }
      state.codeViewPanel.isOpen = !state.codeViewPanel.isOpen;
    },

    toggleTestPanel: (state) => {
      // Close code view first if test panel needs to open
      if (!state.testPanel.isOpen && state.codeViewPanel.isOpen) {
        state.codeViewPanel.isOpen = false;
      }
      state.testPanel.isOpen = !state.testPanel.isOpen;
    },

    updateTestInput: (state, action: PayloadAction<string>) => {
      state.testPanel.testMapInput = action.payload;
    },

    updateTestOutput: (state, action: PayloadAction<TestMapOutput>) => {
      state.testPanel.testMapOutput = action.payload.response;
      state.testPanel.testMapOutputError = action.payload.error;
    },

    toggleShowSelection: (state) => {
      state.testPanel.showSelection = !state.testPanel.showSelection;
    },

    openAddSourceSchemaPanelView: (state) => {
      state.schemaType = SchemaType.Source;
      state.currentPanelView = ConfigPanelView.AddSchema;
    },

    openUpdateSourceSchemaPanelView: (state) => {
      state.schemaType = SchemaType.Source;
      state.currentPanelView = ConfigPanelView.UpdateSchema;
    },

    openAddTargetSchemaPanelView: (state) => {
      state.schemaType = SchemaType.Target;
      state.currentPanelView = ConfigPanelView.AddSchema;
    },

    openUpdateTargetSchemaPanelView: (state) => {
      state.schemaType = SchemaType.Target;
      state.currentPanelView = ConfigPanelView.UpdateSchema;
    },

    closePanel: (state) => {
      state.schemaType = undefined;
      state.currentPanelView = undefined;
    },

    setTestFile: (state, action: PayloadAction<SchemaFile>) => {
      state.testPanel.selectedFile = action.payload;
    },
  },
});

export const {
  openDefaultConfigPanelView,
  openAddSourceSchemaPanelView,
  openUpdateSourceSchemaPanelView,
  openAddTargetSchemaPanelView,
  openUpdateTargetSchemaPanelView,
  closePanel,
  toggleCodeView,
  toggleTestPanel,
  toggleShowSelection,
  setTestFile,
  updateTestInput,
  updateTestOutput,
} = panelSlice.actions;

export default panelSlice.reducer;
