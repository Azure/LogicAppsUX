import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../../global';

export interface McpSelectionState {
  selectedConnectorId: string | undefined;
  selectedOperations: string[];
}

const initialSelectionState: McpSelectionState = {
  selectedConnectorId: undefined,
  selectedOperations: [],
};

export const connectorSlice = createSlice({
  name: 'connector',
  initialState: initialSelectionState,
  reducers: {
    selectConnectorId: (state, action: PayloadAction<string | undefined>) => {
      if (state.selectedConnectorId !== action.payload) {
        state.selectedOperations = [];
        state.selectedConnectorId = action.payload;
      }
    },
    selectOperations: (state, action: PayloadAction<string[]>) => {
      state.selectedOperations = action.payload;
    },
    clearSelectedOperations: (state) => {
      state.selectedOperations = [];
    },
    clearAllSelections: (state) => {
      state.selectedConnectorId = undefined;
      state.selectedOperations = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialSelectionState);
  },
});

export const { selectConnectorId, selectOperations, clearSelectedOperations, clearAllSelections } = connectorSlice.actions;

export default connectorSlice.reducer;
