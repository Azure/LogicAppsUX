import type { Evaluator } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetWorkflowState } from '../global';
import { EvaluationViewMode, type EvaluationState } from './evaluationInterfaces';

export const initialEvaluationState: EvaluationState = {
  selectedEvaluator: null,
  selectedAgentName: null,
  viewMode: EvaluationViewMode.None,
  runningEvaluatorName: '',
  evaluatorSearchQuery: '',
  pendingFormData: null,
  previousFormViewMode: null,
};

export const evaluationSlice = createSlice({
  name: 'evaluation',
  initialState: initialEvaluationState,
  reducers: {
    setSelectedEvaluator: (state, action: PayloadAction<Evaluator | null>) => {
      state.selectedEvaluator = action.payload;
      if (action.payload) {
        state.viewMode = EvaluationViewMode.ViewEvaluator;
      } else {
        state.viewMode = EvaluationViewMode.None;
      }
    },
    setSelectedAgentName: (state, action: PayloadAction<string | null>) => {
      state.selectedAgentName = action.payload;
    },
    setEvaluationViewMode: (state, action: PayloadAction<EvaluationViewMode>) => {
      state.viewMode = action.payload;
    },
    setRunningEvaluatorName: (state, action: PayloadAction<string>) => {
      state.runningEvaluatorName = action.payload;
    },
    setEvaluatorSearchQuery: (state, action: PayloadAction<string>) => {
      state.evaluatorSearchQuery = action.payload;
    },
    startCreateEvaluator: (state) => {
      state.selectedEvaluator = null;
      state.viewMode = EvaluationViewMode.CreateEvaluator;
    },
    startEditEvaluator: (state, action: PayloadAction<Evaluator>) => {
      state.selectedEvaluator = action.payload;
      state.viewMode = EvaluationViewMode.EditEvaluator;
    },
    finishFormAction: (state) => {
      state.viewMode = EvaluationViewMode.None;
      state.selectedEvaluator = null;
    },
    cancelFormAction: (state) => {
      if (state.selectedEvaluator && state.viewMode === EvaluationViewMode.EditEvaluator) {
        state.viewMode = EvaluationViewMode.ViewEvaluator;
      } else {
        state.viewMode = EvaluationViewMode.None;
        state.selectedEvaluator = null;
      }
    },
    startSelectConnection: (state, action: PayloadAction<unknown>) => {
      state.pendingFormData = action.payload;
      state.previousFormViewMode = state.viewMode;
      state.viewMode = EvaluationViewMode.SelectConnection;
    },
    finishSelectConnection: (state, action: PayloadAction<{ connectionReferenceKey: string; agentModelType: string }>) => {
      const pending = state.pendingFormData as any;
      if (pending) {
        pending.connectionReferenceKey = action.payload.connectionReferenceKey;
        pending.agentModelType = action.payload.agentModelType;
        // Clear deployment selection since it depends on the specific connection
        pending.deploymentId = '';
        pending.modelName = '';
      }
      state.viewMode = state.previousFormViewMode ?? EvaluationViewMode.CreateEvaluator;
      state.previousFormViewMode = null;
    },
    cancelSelectConnection: (state) => {
      state.viewMode = state.previousFormViewMode ?? EvaluationViewMode.CreateEvaluator;
      state.previousFormViewMode = null;
    },
    clearPendingFormData: (state) => {
      state.pendingFormData = null;
    },
    resetEvaluationState: () => initialEvaluationState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialEvaluationState);
  },
});

export const {
  setSelectedEvaluator,
  setSelectedAgentName,
  setEvaluationViewMode,
  setRunningEvaluatorName,
  setEvaluatorSearchQuery,
  startCreateEvaluator,
  startEditEvaluator,
  finishFormAction,
  cancelFormAction,
  startSelectConnection,
  finishSelectConnection,
  cancelSelectConnection,
  clearPendingFormData,
  resetEvaluationState,
} = evaluationSlice.actions;

export default evaluationSlice.reducer;
