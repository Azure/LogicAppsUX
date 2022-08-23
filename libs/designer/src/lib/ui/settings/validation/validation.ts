import type { RootState } from '../../../core';
import type { Settings } from '../../../core/actions/bjsworkflow/settings';
import type { OperationMetadataState } from '../../../core/state/operation/operationMetadataSlice';
import type { ValidationError } from '../../../core/state/settingSlice';
import { ValidationErrorKeys } from '../../../core/state/settingSlice';

export const validate = <K extends keyof RootState>(
  validationType: K,
  nodeId: string,
  proposedState: RootState[K]
): Record<string, ValidationError[]> | null => {
  switch (validationType) {
    case 'operations': {
      const proposedOperationMetadataState = proposedState as OperationMetadataState;
      const errors = validateOperationSettings(proposedOperationMetadataState.settings[nodeId]);
      return errors.length ? { [nodeId]: errors } : null;
    }
    default:
      return null;
  }
};

const validateOperationSettings = (_settings: Settings): ValidationError[] => {
  const errors: ValidationError[] = [];
  // all setting validation logic based on settings goes here
  errors.push({
    key: ValidationErrorKeys.PAGING_COUNT,
    message: `Paging count invalid : dummy paging val`,
  }); // forced push for testing
  return errors;
};
