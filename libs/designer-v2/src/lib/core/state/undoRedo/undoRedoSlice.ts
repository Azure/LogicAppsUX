import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { resetWorkflowState } from '../global';
import type { StateHistory, StateHistoryItem } from './undoRedoTypes';

export const initialState: StateHistory = {
  past: [],
  future: [],
  undoRedoClickToggle: 0,
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
      // Add current edited panel details to state being added to history
      const newStateItem: StateHistoryItem = {
        compressedState: action.payload.compressedState,
        editedPanelTab: state.currentEditedPanelTab,
        editedPanelNode: state.currentEditedPanelNode,
      };

      // Update current edited panel details to the one from the state we are undoing to
      // This ensures we don't lose track of edited panel details on undo/redo click when state is updated
      state.currentEditedPanelTab = state.past[state.past.length - 1].editedPanelTab;
      state.currentEditedPanelNode = state.past[state.past.length - 1].editedPanelNode;
      state.past = state.past.slice(0, state.past.length - 1);
      state.future = [newStateItem, ...state.future];
      state.undoRedoClickToggle = state.undoRedoClickToggle === 0 ? 1 : 0;
    },
    updateStateHistoryOnRedoClick: (state, action: PayloadAction<StateHistoryItem>) => {
      // Add current edited panel details to state being added to history
      const newStateItem: StateHistoryItem = {
        compressedState: action.payload.compressedState,
        editedPanelTab: state.currentEditedPanelTab,
        editedPanelNode: state.currentEditedPanelNode,
      };

      // Update current edited panel details to the one from the state we are redoing to
      // This ensures we don't lose track of edited panel details on undo/redo click when state is updated
      state.currentEditedPanelTab = state.future[0].editedPanelTab;
      state.currentEditedPanelNode = state.future[0].editedPanelNode;
      state.future = state.future.slice(1);
      state.past = [...state.past, newStateItem];
      state.undoRedoClickToggle = state.undoRedoClickToggle === 0 ? 1 : 0;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { saveStateToHistory, updateStateHistoryOnUndoClick, updateStateHistoryOnRedoClick } = undoRedoSlice.actions;

export default undoRedoSlice.reducer;
