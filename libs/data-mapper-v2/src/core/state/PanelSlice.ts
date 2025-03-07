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
export type MapCheckTabType = 'error' | 'warning';

export type TestPanelState = {
  isOpen: boolean;
  showSelection: boolean;
  selectedFile?: SchemaFile;
  testMapInput?: string;
  testMapOutput?: TestMapResponse;
  testMapOutputError?: Error;
};

export type FunctionPanelState = {
  isOpen: boolean;
};

export type MapCheckPanelState = {
  isOpen: boolean;
  selectedTab: MapCheckTabType;
};

export type CodeViewState = {
  isOpen: boolean;
};

export interface PanelState {
  currentPanelView?: ConfigPanelView;
  schemaType?: SchemaType;
  testPanel: TestPanelState;
  codeViewPanel: CodeViewState;
  functionPanel: FunctionPanelState;
  mapCheckerPanel: MapCheckPanelState;
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
  functionPanel: {
    isOpen: true,
  },
  mapCheckerPanel: {
    isOpen: false,
    selectedTab: 'error',
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

    openMapChecker: (state) => {
      const newState = true;

      if (newState) {
        state.codeViewPanel.isOpen = false;
        state.testPanel.isOpen = false;
        state.functionPanel.isOpen = false;
      }

      state.mapCheckerPanel.isOpen = true;
    },

    toggleMapChecker: (state) => {
      const newState = !state.mapCheckerPanel.isOpen;

      if (newState) {
        state.codeViewPanel.isOpen = false;
        state.testPanel.isOpen = false;
        state.functionPanel.isOpen = false;
      }

      state.mapCheckerPanel.isOpen = newState;
    },

    toggleCodeView: (state) => {
      const newState = !state.codeViewPanel.isOpen;

      // Close other panels if code view panel is opened
      if (newState) {
        state.mapCheckerPanel.isOpen = false;
        state.testPanel.isOpen = false;
        state.functionPanel.isOpen = false;
      }

      state.codeViewPanel.isOpen = newState;
    },

    toggleTestPanel: (state) => {
      const newState = !state.testPanel.isOpen;

      // Close other panels if test panel is opened
      if (newState) {
        state.mapCheckerPanel.isOpen = false;
        state.codeViewPanel.isOpen = false;
        state.functionPanel.isOpen = false;
      }

      state.testPanel.isOpen = newState;
    },

    toggleFunctionPanel: (state) => {
      const newState = !state.functionPanel.isOpen;

      // Close other panels if function panel is opened
      if (newState) {
        state.mapCheckerPanel.isOpen = false;
        state.codeViewPanel.isOpen = false;
        state.testPanel.isOpen = false;
      }

      state.functionPanel.isOpen = newState;
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

    setSelectedMapCheckerTab: (state, action: PayloadAction<MapCheckTabType>) => {
      state.mapCheckerPanel.selectedTab = action.payload;
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
  toggleFunctionPanel,
  toggleMapChecker,
  openMapChecker,
  setSelectedMapCheckerTab,
} = panelSlice.actions;

export default panelSlice.reducer;
