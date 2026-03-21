import type { Evaluator } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetWorkflowState } from '../global';
import type { EvaluationState, RightPanelView } from './evaluationInterfaces';

export const initialEvaluationState: EvaluationState = {
  selectedEvaluator: null,
  selectedAgentName: null,
  rightPanelView: 'empty',
  runningEvaluatorName: '',
  evaluatorSearchQuery: '',
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
    setSelectedAgentName: (state, action: PayloadAction<string | null>) => {
      state.selectedAgentName = action.payload;
    },
    setRightPanelView: (state, action: PayloadAction<RightPanelView>) => {
      state.rightPanelView = action.payload;
    },
    setRunningEvaluatorName: (state, action: PayloadAction<string>) => {
      state.runningEvaluatorName = action.payload;
    },
    setEvaluatorSearchQuery: (state, action: PayloadAction<string>) => {
      state.evaluatorSearchQuery = action.payload;
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
  setSelectedAgentName,
  setRightPanelView,
  setRunningEvaluatorName,
  setEvaluatorSearchQuery,
  startCreateEvaluator,
  startEditEvaluator,
  finishFormAction,
  cancelFormAction,
  resetEvaluationState,
} = evaluationSlice.actions;

export default evaluationSlice.reducer;
