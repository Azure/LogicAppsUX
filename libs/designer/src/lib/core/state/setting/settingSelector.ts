import type { RootState } from '../../store';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

const getSettingsState = (state: RootState) => state.settings;

export const useExpandedSections = () => {
  return useSelector(createSelector(getSettingsState, (settings) => settings.expandedSections));
};

export const useAllSettingsValidationErrors = () => {
  return useSelector(createSelector(getSettingsState, (settings) => settings.validationErrors));
};

export const useSettingValidationErrors = (nodeId: string) => {
  return useSelector(createSelector(getSettingsState, (settings) => settings.validationErrors?.[nodeId] ?? []));
};
