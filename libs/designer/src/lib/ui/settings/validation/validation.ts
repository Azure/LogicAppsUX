import constants from '../../../common/constants';
import type { RootState } from '../../../core';
import type { Settings } from '../../../core/actions/bjsworkflow/settings';
import type { OperationMetadataState } from '../../../core/state/operation/operationMetadataSlice';
import type { ValidationError } from '../../../core/state/settingSlice';
import { ValidationErrorKeys } from '../../../core/state/settingSlice';

export const validate = <K extends keyof RootState>(validationType: K, proposedState: RootState[K]): ValidationError[] | null => {
  switch (validationType) {
    case 'operations': {
      const proposedOperationMetadataState = proposedState as OperationMetadataState;
      const errors = validateOperationSettings(
        proposedOperationMetadataState.settings[Object.keys(proposedOperationMetadataState.settings)[0]]
      );
      return errors.length ? errors : null;
    }
    default:
      return null;
  }
};

const validateOperationSettings = (settings: Settings): ValidationError[] => {
  const { conditionExpressions, paging /*paging, retryPolicy, singleInstance, splitOn, timeout */ } = settings;
  const validationErrors: ValidationError[] = [];

  if (conditionExpressions?.value?.some((conditionExpression) => !conditionExpression)) {
    validationErrors.push({
      key: ValidationErrorKeys.TRIGGER_CONDITION_EMPTY,
      message: 'trigger condition cannot be empty', //import localized string?
    });
  }

  if (paging?.value?.enabled) {
    const { value } = paging.value;
    if (isNaN(Number(value))) {
      validationErrors.push({
        key: ValidationErrorKeys.PAGING_COUNT, //import localized string?
        message: 'paging count error message',
      });
    } else if (!value || value <= 0 || value > constants.MAX_PAGING_COUNT) {
      validationErrors.push({
        key: ValidationErrorKeys.PAGING_COUNT,
        message: 'paging count max error message', //import localized string?
      });
    }
  }

  return validationErrors;
};
