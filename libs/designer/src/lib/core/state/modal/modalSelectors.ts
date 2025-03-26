import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useIsCombineVariableModalOpen = () => {
  return useSelector((state: RootState) => state.modal.isCombineVariableOpen);
};

export const useResolveCombineVariable = () => {
  return useSelector((state: RootState) => state.modal.resolveCombineVariable);
};

export const useIsTriggerDescriptionModalOpen = () => {
  return useSelector((state: RootState) => state.modal.isTriggerDescriptionOpen);
};

export const useShouldPromptForTriggerDescription = () => {
  return useSelector((state: RootState) => {
    // Must have 3 nodes
    const operationKeys = Object.keys(state.workflow.operations);
    if (operationKeys.length !== 3) {
      return false;
    }
    // Must start with request and end with response
    const trigger = state.workflow.operations[operationKeys[0]];
    const triggerIsRequest = trigger?.type === 'Request' && trigger?.kind === 'Http';
    const response = state.workflow.operations[operationKeys[2]];
    const lastIsResponse = response?.type === 'Response' && response?.kind === 'Http';
    if (!triggerIsRequest || !lastIsResponse) {
      return false;
    }
    // Must not already have a description on the trigger
    if (trigger?.description !== undefined) {
      return false;
    }

    return true;
  });
};
