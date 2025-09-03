import type { ValidationError } from '../../../ui/settings/validation/validation';
import { resetWorkflowState, setStateAfterUndoRedo } from '../global';
import type { UndoRedoPartialRootState } from '../undoRedo/undoRedoTypes';
import { SettingSectionName, type SettingsState } from './settingInterface';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export const initialState: SettingsState = {
  validationErrors: {},
  expandedSections: [
    SettingSectionName.DATAHANDLING,
    SettingSectionName.GENERAL,
    SettingSectionName.NETWORKING,
    SettingSectionName.RUNAFTER,
    SettingSectionName.SECURITY,
    SettingSectionName.TRACKING,
  ],
};

export const settingsSlice = createSlice({
  name: 'operationSettings',
  initialState,
  reducers: {
    setValidationError: (state: SettingsState, action: PayloadAction<{ nodeId: string; errors: ValidationError[] }>) => {
      if (!action?.payload) {
        return;
      }
      const { nodeId, errors } = action.payload;
      if (errors.length === 0) {
        delete state.validationErrors[nodeId];
      } else {
        state.validationErrors[nodeId] = errors;
      }
    },
    setExpandedSections: (state: SettingsState, action: PayloadAction<SettingSectionName>) => {
      if (!action || !action.payload) {
        return;
      }
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
    builder.addCase(setStateAfterUndoRedo, (_, action: PayloadAction<UndoRedoPartialRootState>) => action.payload.settings);
  },
});

export const { setValidationError, setExpandedSections } = settingsSlice.actions;

export default settingsSlice.reducer;
