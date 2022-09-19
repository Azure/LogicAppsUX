import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export enum ValidationErrorKeys {
  CHUNK_SIZE_INVALID = 'ChunkSizeInvalid',
  PAGING_COUNT = 'PagingCount',
  RETRY_COUNT_INVALID = 'RetryCountInvalid',
  RETRY_INTERVAL_EMPTY = 'RetryIntervalEmpty',
  SINGLE_INSTANCE_SPLITON = 'SingleInstanceSplitOn',
  TRIGGER_CONDITION_EMPTY = 'TriggerConditionEmpty',
  TIMEOUT_VALUE_INVALID = 'TimeoutValueInvalid',
  RETRY_INTERVAL_INVALID = 'RetryIntervalInvalid',
  CANNOT_DELETE_LAST_ACTION = 'CannotDeleteLastAction',
}

export interface ValidationError {
  key: ValidationErrorKeys;
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
    setValidationError: (state: SettingsState, action: PayloadAction<Record<string, ValidationError[]>>) => {
      if (!action || !action.payload) return;
      const { payload } = action;
      const nodeId = Object.keys(action.payload)[0];

      state.validationErrors = {
        ...state.validationErrors,
        [nodeId]: state.validationErrors[nodeId] ? [...state.validationErrors[nodeId], ...payload[nodeId]] : payload[nodeId],
      };
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
});

export const { setValidationError, setExpandedSections } = settingsSlice.actions;

export default settingsSlice.reducer;
