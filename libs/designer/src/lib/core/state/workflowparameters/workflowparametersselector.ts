import type { RootState } from '../../store';
import type { WorkflowParametersState } from './workflowparametersSlice';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export const getWorkflowParametersState = (state: RootState): WorkflowParametersState => state.workflowParameters;

export const useWorkflowParameters = () =>
  useSelector(createSelector(getWorkflowParametersState, (state: WorkflowParametersState) => state.definitions));

export const useWorkflowParameterValidationErrors = () =>
  useSelector(createSelector(getWorkflowParametersState, (state: WorkflowParametersState) => state.validationErrors));

export const useIsWorkflowParametersDirty = () =>
  useSelector(createSelector(getWorkflowParametersState, (state: WorkflowParametersState) => state.isDirty));
