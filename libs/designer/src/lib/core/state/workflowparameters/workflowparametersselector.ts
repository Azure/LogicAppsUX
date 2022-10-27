import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useWorkflowParameters = () => {
  return useSelector((rootState: RootState) => rootState.workflowParameters.definitions);
};

export const useWorkflowParameterValidationErrors = () => {
  return useSelector((rootState: RootState) => rootState.workflowParameters.validationErrors);
};
