import { resetWorkflowState } from '../global';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export enum ValidationErrorKeys {
  CHUNK_SIZE_INVALID = 'ChunkSizeInvalid',
  PAGING_COUNT = 'PagingCount',
  RETRY_COUNT_INVALID = 'RetryCountInvalid',
  RETRY_INTERVAL_INVALID = 'RetryIntervalInvalid',
  SINGLE_INSTANCE_SPLITON = 'SingleInstanceSplitOn',
  TRIGGER_CONDITION_EMPTY = 'TriggerConditionEmpty',
  TIMEOUT_VALUE_INVALID = 'TimeoutValueInvalid',
}

export enum ValidationWarningKeys {
  CANNOT_DELETE_LAST_ACTION = 'CannotDeleteLastAction',
  CANNOT_DELETE_LAST_STATUS = 'CannotDeleteLastStatus',
}

export interface ValidationError {
  key: ValidationErrorKeys | ValidationWarningKeys;
  message: string;
}

export interface SettingsState {
  validationErrors: Record<string, ValidationError[]>;
  expandedSections: string[];
}

const initialState: SettingsState = {
  validationErrors: {},
  expandedSections: [],
};

export const settingsSlice = createSlice({
  name: 'operationSettings',
  initialState,
  reducers: {
    setValidationError: (state: SettingsState, action: PayloadAction<{ nodeId: string; errors: ValidationError[] }>) => {
      if (!action?.payload) return;
      const { nodeId, errors } = action.payload;
      if (errors.length === 0) delete state.validationErrors[nodeId];
      else state.validationErrors[nodeId] = errors;
    },
    setExpandedSections: (state: SettingsState, action: PayloadAction<string>) => {
      if (!action || !action.payload) return;
      const { payload: sectionName } = action;
      if (state.expandedSections.includes(sectionName)) {
        state.expandedSections = state.expandedSections.filter((cv) => cv !== sectionName);
      } else {
        state.expandedSections = [...state.expandedSections, sectionName];
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { setValidationError, setExpandedSections } = settingsSlice.actions;

export default settingsSlice.reducer;
