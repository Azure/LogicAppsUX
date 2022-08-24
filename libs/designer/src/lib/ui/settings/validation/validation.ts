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

const validateOperationSettings = (settings: Settings): ValidationError[] => {
  const { conditionExpressions /*paging, retryPolicy, singleInstance, splitOn, timeout*/ } = settings;
  const validationErrors: ValidationError[] = [];

  if (conditionExpressions?.value?.some((conditionExpression) => !conditionExpression)) {
    validationErrors.push({
      key: ValidationErrorKeys.TRIGGER_CONDITION_EMPTY,
      message: 'trigger condition cannot be empty',
    });
  }
  validationErrors.push({
    key: ValidationErrorKeys.PAGING_COUNT,
    message: `test error message`,
  }); // forced push for testing
  return validationErrors;
};
