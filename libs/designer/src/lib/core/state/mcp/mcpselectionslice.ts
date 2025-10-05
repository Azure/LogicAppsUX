import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../global';
import { initializeOperationsMetadata } from '../../../core/actions/bjsworkflow/mcp';
import { ErrorLevel, updateErrorDetails } from '../operation/operationMetadataSlice';
import { setInitialData } from './resourceSlice';

export interface McpSelectionState {
  selectedConnectorId: string | undefined;
  selectedOperations: string[];
  selectedOperationId?: string;
  disableLogicAppSelection?: boolean;
  disableConnectorSelection?: boolean;
  errors: {
    operations?: string;
    operationDetails?: Record<string, { general?: string; parameters?: string }>;
  };
}

const initialSelectionState: McpSelectionState = {
  selectedConnectorId: undefined,
  selectedOperations: [],
  selectedOperationId: undefined,
  errors: {},
};

const clearAllSelectionsReducer = (state: typeof initialSelectionState) => {
  if (!state.disableConnectorSelection) {
    state.selectedConnectorId = undefined;
  }
  state.selectedOperations = [];
  state.errors.operations = undefined;
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
    clearAllSelections: clearAllSelectionsReducer,
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialSelectionState);
    builder.addCase(setInitialData, (state, action) => {
      if (action.payload.logicAppName) {
        state.disableLogicAppSelection = true;
      }

      if (action.payload.connectorId) {
        state.disableConnectorSelection = true;
        state.selectedConnectorId = action.payload.connectorId;
        state.selectedOperations = [];
      }
    });
    builder.addCase(initializeOperationsMetadata.fulfilled, clearAllSelectionsReducer);
    builder.addCase(initializeOperationsMetadata.rejected, (state, action) => {
      state.errors.operations = action.error.message ?? 'Failed to initialize operation details.';
    });

    builder.addCase(updateErrorDetails, (state, action) => {
      const { id, errorInfo } = action.payload;
      if (id && errorInfo?.level === ErrorLevel.DynamicInputs) {
        state.errors.operationDetails = {
          ...state.errors.operationDetails,
          [id]: {
            ...state.errors.operationDetails?.[id],
            general: errorInfo.message,
          },
        };
      }
    });
  },
});

export const { selectConnectorId, selectOperations, clearAllSelections, selectOperationIdToEdit } = mcpSelectionSlice.actions;

export default mcpSelectionSlice.reducer;
