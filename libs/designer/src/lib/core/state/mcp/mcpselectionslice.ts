import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../global';

export interface McpSelectionState {
  selectedConnectorId: string | undefined;
  selectedOperations: string[];
  selectedOperationId?: string;
}

const initialSelectionState: McpSelectionState = {
  selectedConnectorId: undefined,
  selectedOperations: [],
  selectedOperationId: undefined,
};

export const mcpSelectionSlice = createSlice({
  name: 'mcpSelection',
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
    selectOperationIdToEdit: (state, action: PayloadAction<string | undefined>) => {
      state.selectedOperationId = action.payload;
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

export const { selectConnectorId, selectOperations, clearSelectedOperations, clearAllSelections, selectOperationIdToEdit } =
  mcpSelectionSlice.actions;

export default mcpSelectionSlice.reducer;
