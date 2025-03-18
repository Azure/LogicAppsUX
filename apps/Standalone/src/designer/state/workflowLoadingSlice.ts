/* eslint-disable @typescript-eslint/no-empty-function */
import { getStateHistory, setStateHistory } from './historyHelpers';
import type { RootState } from './store';
import type { ConnectionReferences, WorkflowParameter } from '@microsoft/logic-apps-designer';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { readJsonFiles } from './helper';

export type HostingPlanTypes = 'standard' | 'consumption' | 'hybrid';

export interface WorkflowLoadingState {
  resourcePath?: string;
  appId?: string;
  workflowName?: string;
  runId?: string;
  workflowDefinition: LogicAppsV2.WorkflowDefinition | null;
  runInstance: LogicAppsV2.RunInstanceDefinition | null;
  connections: ConnectionReferences;
  isReadOnly: boolean;
  isMonitoringView: boolean;
  isDarkMode: boolean;
  hostingPlan: HostingPlanTypes;
  isLocal: boolean;
  showChatBot?: boolean;
  showRunHistory?: boolean;
  parameters: Record<string, WorkflowParameter>;
  showConnectionsPanel?: boolean;
  workflowKind?: string;
  language: string;
  areCustomEditorsEnabled?: boolean;
  suppressDefaultNodeSelect?: boolean;
  hostOptions: {
    displayRuntimeInfo: boolean; // show info about where the action is run(i.e. InApp/Shared/Custom)
    stringOverrides?: Record<string, string>; // string overrides for localization
    maxStateHistorySize?: number; // maximum number of states to save in history for undo/redo
    collapseGraphsByDefault?: boolean; // collapse scope by default
    enableMultiVariable?: boolean; // supports creating multiple variables in one action
  };
  showPerformanceDebug?: boolean;
  runFiles: any[];
  queryCachePersist?: boolean;
}

const initialState: WorkflowLoadingState = {
  appId: undefined,
  workflowDefinition: null,
  parameters: {},
  runInstance: null,
  connections: {},
  resourcePath: '',
  isReadOnly: false,
  isMonitoringView: false,
  isDarkMode: false,
  hostingPlan: 'standard',
  isLocal: false,
  showChatBot: false,
  showConnectionsPanel: false,
  workflowKind: 'stateful',
  language: 'en',
  areCustomEditorsEnabled: false,
  suppressDefaultNodeSelect: false,
  hostOptions: {
    displayRuntimeInfo: true,
    maxStateHistorySize: 0,
    collapseGraphsByDefault: false,
    enableMultiVariable: false,
  },
  showPerformanceDebug: false,
  runFiles: [],
  queryCachePersist: false,
};

type WorkflowPayload = {
  workflowDefinition: LogicAppsV2.WorkflowDefinition;
  connectionReferences: ConnectionReferences;
  parameters: Record<string, WorkflowParameter>;
  runFiles: any[];
  workflowKind?: string;
};

type RunPayload = {
  runInstance: LogicAppsV2.RunInstanceDefinition;
};

type LoadRunPayload = {
  runFile: Record<string, any>;
};

export const loadWorkflow = createAsyncThunk('workflowLoadingState/loadWorkflow', async (_: unknown, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const fileName = currentState.workflowLoader.resourcePath?.split('.')[0];
  const isMonitoringView = currentState.workflowLoader.isMonitoringView;

  const runFiles = isMonitoringView && fileName ? await readJsonFiles(fileName) : [];
  const wf = await import(`../../../../../__mocks__/workflows/${fileName}.json`);
  return {
    workflowDefinition: wf.definition as LogicAppsV2.WorkflowDefinition,
    connectionReferences: wf.connections as ConnectionReferences,
    parameters: wf?.parameters ?? wf?.definition?.parameters ?? {},
    workflowKind: wf?.kind,
    runFiles,
  } as WorkflowPayload;
});

export const loadRun = createAsyncThunk('runLoadingState/loadRun', async (payload: LoadRunPayload, thunkAPI) => {
  try {
    const runInstance = payload.runFile;

    return {
      runInstance: {
        properties: runInstance.properties,
        id: runInstance.id,
        type: runInstance.type,
      },
    } as RunPayload;
  } catch {
    return thunkAPI.rejectWithValue(null);
  }
});

export const workflowLoadingSlice = createSlice({
  name: 'workflowLoader',
  initialState,
  reducers: {
    setAppid: (state, action: PayloadAction<string>) => {
      state.appId = action.payload;
    },
    setWorkflowName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    changeRunId: (state, action: PayloadAction<string | undefined>) => {
      state.runId = action.payload;
    },
    setResourcePath: (state, action: PayloadAction<string>) => {
      state.resourcePath = action.payload;
      // Set resource path to history
      setStateHistory(state);
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
    setReadOnly: (state, action: PayloadAction<boolean>) => {
      state.isReadOnly = action.payload;
    },
    setMonitoringView: (state, action: PayloadAction<boolean>) => {
      state.isMonitoringView = action.payload;
      if (action.payload) {
        state.isReadOnly = true;
      }
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },
    setHostingPlan: (state, action: PayloadAction<HostingPlanTypes>) => {
      state.hostingPlan = action.payload;
      state.appId = undefined;
      state.workflowName = undefined;
      state.resourcePath = '';
    },
    setIsLocalSelected: (state, action: PayloadAction<boolean>) => {
      state.isLocal = action.payload;
      state.appId = undefined;
      state.workflowName = undefined;
    },
    setIsChatBotEnabled: (state, action: PayloadAction<boolean>) => {
      state.showChatBot = action.payload;
    },
    setRunHistoryEnabled: (state, action: PayloadAction<boolean>) => {
      state.showRunHistory = action.payload;
    },
    setShowConnectionsPanel: (state, action: PayloadAction<boolean>) => {
      state.showConnectionsPanel = action.payload;
    },
    loadLastWorkflow: (state) => {
      const lastWorkflow = getStateHistory() as WorkflowLoadingState;
      if (!lastWorkflow) {
        return;
      }
      // Load last workflow state object
      state.resourcePath = lastWorkflow.resourcePath;
      state.appId = lastWorkflow.appId;
      state.workflowName = lastWorkflow.workflowName;
      state.runId = lastWorkflow.runId;
      state.language = lastWorkflow.language;
      state.isLocal = lastWorkflow.isLocal;
      state.hostingPlan = lastWorkflow.hostingPlan;
      state.isDarkMode = lastWorkflow.isDarkMode;
      state.isReadOnly = lastWorkflow.isReadOnly;
      state.isMonitoringView = lastWorkflow.isMonitoringView;
      // Clear these state values, they get built with the other values
      state.workflowDefinition = null;
      state.runInstance = null;
      state.connections = {};
    },
    setAreCustomEditorsEnabled: (state, action: PayloadAction<boolean>) => {
      state.areCustomEditorsEnabled = action.payload;
    },
    setSuppressDefaultNodeSelect: (state, action: PayloadAction<boolean>) => {
      state.suppressDefaultNodeSelect = action.payload;
    },
    setHostOptions: (state, action: PayloadAction<Partial<WorkflowLoadingState['hostOptions']>>) => {
      state.hostOptions = { ...state.hostOptions, ...action.payload };
    },
    setShowPerformanceDebug: (state, action: PayloadAction<boolean>) => {
      state.showPerformanceDebug = action.payload;
    },
    setStringOverrides: (state, action: PayloadAction<Record<string, string> | undefined>) => {
      state.hostOptions.stringOverrides = action.payload;
    },
    setQueryCachePersist: (state, action: PayloadAction<boolean>) => {
      state.queryCachePersist = action.payload;
    },
    setEnableMultiVariable: (state, action: PayloadAction<boolean>) => {
      state.hostOptions.enableMultiVariable = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadWorkflow.fulfilled, (state, action: PayloadAction<WorkflowPayload | null>) => {
      if (!action.payload) {
        return;
      }
      state.workflowDefinition = action.payload?.workflowDefinition;
      state.connections = action.payload?.connectionReferences ?? {};
      state.parameters = action.payload?.parameters ?? {};
      state.runFiles = action.payload?.runFiles ?? [];
      state.workflowKind = action.payload?.workflowKind ?? 'stateful';
    });
    builder.addCase(loadWorkflow.rejected, (state) => {
      state.workflowDefinition = null;
      state.parameters = {};
    });
    builder.addCase(loadRun.fulfilled, (state, action: PayloadAction<RunPayload | null>) => {
      if (!action.payload) {
        return;
      }
      state.runInstance = action.payload?.runInstance;
    });
    builder.addCase(loadRun.rejected, (state) => {
      state.runInstance = null;
    });
  },
});

export const {
  setResourcePath,
  setAppid,
  setWorkflowName,
  clearWorkflowDetails,
  setReadOnly,
  setMonitoringView,
  setDarkMode,
  setHostingPlan,
  setIsLocalSelected,
  setIsChatBotEnabled,
  setRunHistoryEnabled,
  setShowConnectionsPanel,
  changeRunId,
  setLanguage,
  loadLastWorkflow,
  setAreCustomEditorsEnabled,
  setSuppressDefaultNodeSelect,
  setHostOptions,
  setShowPerformanceDebug,
  setStringOverrides,
  setQueryCachePersist,
  setEnableMultiVariable,
} = workflowLoadingSlice.actions;

export default workflowLoadingSlice.reducer;
