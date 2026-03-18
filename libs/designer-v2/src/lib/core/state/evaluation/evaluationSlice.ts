import type { Evaluator } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetWorkflowState } from '../global';
import type { EvaluationState, RightPanelView, WorkflowRunEntry, AgentAction } from './evaluationInterfaces';

export const initialEvaluationState: EvaluationState = {
  selectedEvaluator: null,
  selectedRun: null,
  selectedAction: null,
  agentActions: [],
  agentActionsLoading: false,
  rightPanelView: 'empty',
  runningEvaluatorName: '',
  searchQuery: '',
};

export const evaluationSlice = createSlice({
  name: 'evaluation',
  initialState: initialEvaluationState,
  reducers: {
    setSelectedEvaluator: (state, action: PayloadAction<Evaluator | null>) => {
      state.selectedEvaluator = action.payload;
      if (action.payload) {
        state.rightPanelView = 'view';
      } else {
        state.rightPanelView = 'empty';
      }
    },
    setSelectedRun: (state, action: PayloadAction<WorkflowRunEntry | null>) => {
      state.selectedRun = action.payload;
      state.selectedAction = null;
    },
    setSelectedAction: (state, action: PayloadAction<AgentAction | null>) => {
      state.selectedAction = action.payload;
    },
    setAgentActions: (state, action: PayloadAction<AgentAction[]>) => {
      state.agentActions = action.payload;
    },
    setAgentActionsLoading: (state, action: PayloadAction<boolean>) => {
      state.agentActionsLoading = action.payload;
    },
    setRightPanelView: (state, action: PayloadAction<RightPanelView>) => {
      state.rightPanelView = action.payload;
    },
    setRunningEvaluatorName: (state, action: PayloadAction<string>) => {
      state.runningEvaluatorName = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    startCreateEvaluator: (state) => {
      state.selectedEvaluator = null;
      state.rightPanelView = 'create';
    },
    startEditEvaluator: (state, action: PayloadAction<Evaluator>) => {
      state.selectedEvaluator = action.payload;
      state.rightPanelView = 'edit';
    },
    finishFormAction: (state) => {
      state.rightPanelView = 'empty';
      state.selectedEvaluator = null;
    },
    cancelFormAction: (state) => {
      if (state.selectedEvaluator && state.rightPanelView === 'edit') {
        state.rightPanelView = 'view';
      } else {
        state.rightPanelView = 'empty';
        state.selectedEvaluator = null;
      }
    },
    resetEvaluationState: () => initialEvaluationState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialEvaluationState);
  },
});

export const {
  setSelectedEvaluator,
  setSelectedRun,
  setSelectedAction,
  setAgentActions,
  setAgentActionsLoading,
  setRightPanelView,
  setRunningEvaluatorName,
  setSearchQuery,
  startCreateEvaluator,
  startEditEvaluator,
  finishFormAction,
  cancelFormAction,
  resetEvaluationState,
} = evaluationSlice.actions;

export default evaluationSlice.reducer;
