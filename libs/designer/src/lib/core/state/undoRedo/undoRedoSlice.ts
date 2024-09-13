import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { resetWorkflowState } from '../global';
import type { StateHistory, StateHistoryItem } from './undoRedoTypes';

export const initialState: StateHistory = {
  past: [],
  future: [],
  stateHistoryItemIndex: -1,
};

export const undoRedoSlice = createSlice({
  name: 'undoRedo',
  initialState,
  reducers: {
    saveStateToHistory: (state, action: PayloadAction<{ stateHistoryItem: StateHistoryItem; limit: number }>) => {
      state.past = [
        ...(state.past.length < action.payload.limit ? state.past : state.past.slice(1, state.past.length)),
        { ...action.payload.stateHistoryItem },
      ];
      state.future = [];
      state.currentEditedPanelTab = undefined;
      state.currentEditedPanelNode = undefined;
    },
    updateStateHistoryOnUndoClick: (state, action: PayloadAction<StateHistoryItem>) => {
      state.currentEditedPanelTab = state.past[state.past.length - 1].editedPanelTab;
      state.currentEditedPanelNode = state.past[state.past.length - 1].editedPanelNode;
      state.past = state.past.slice(0, state.past.length - 1);
      state.future = [action.payload, ...state.future];
      state.stateHistoryItemIndex = state.past.length;
    },
    updateStateHistoryOnRedoClick: (state, action: PayloadAction<StateHistoryItem>) => {
      state.currentEditedPanelTab = state.future[0].editedPanelTab;
      state.currentEditedPanelNode = state.future[0].editedPanelNode;
      state.future = state.future.slice(1);
      state.past = [...state.past, action.payload];
      state.stateHistoryItemIndex = state.past.length;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { saveStateToHistory, updateStateHistoryOnUndoClick, updateStateHistoryOnRedoClick } = undoRedoSlice.actions;

export default undoRedoSlice.reducer;
