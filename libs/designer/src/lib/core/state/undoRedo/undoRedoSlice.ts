import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { resetWorkflowState } from '../global';
import type { StateHistory } from './undoRedoTypes';

export const initialState: StateHistory = {
  past: [],
  future: [],
};

export const undoRedoSlice = createSlice({
  name: 'undoRedo',
  initialState,
  reducers: {
    saveStateToHistory: (state, action: PayloadAction<{ compressedState: string; limit: number }>) => {
      if (action.payload.limit < 1) {
        return;
      }
      state.past = [
        ...(state.past.length < action.payload.limit ? state.past : state.past.slice(1, state.past.length)),
        action.payload.compressedState,
      ];
      state.future = [];
    },
    updateStateHistoryOnUndoClick: (state, action: PayloadAction<string>) => {
      state.past = state.past.slice(0, state.past.length - 1);
      state.future = [action.payload, ...state.future];
    },
    updateStateHistoryOnRedoClick: (state, action: PayloadAction<string>) => {
      state.future = state.future.slice(1);
      state.past = [...state.past, action.payload];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { saveStateToHistory, updateStateHistoryOnUndoClick, updateStateHistoryOnRedoClick } = undoRedoSlice.actions;

export default undoRedoSlice.reducer;
