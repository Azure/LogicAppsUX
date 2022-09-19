import constants from '../../../common/constants';
import type { RootState } from '../../../core';
import type { Settings } from '../../../core/actions/bjsworkflow/settings';
import type { OperationMetadataState } from '../../../core/state/operation/operationMetadataSlice';
import { ValidationErrorKeys, type ValidationError } from '../../../core/state/settingSlice';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

export const useValidate = () => {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const intl = useIntl();
  const triggerConditionEmpty = intl.formatMessage({
    defaultMessage: 'Trigger condition cannot be empty',
    description: 'error message for empty trigger condition',
  });
  const pagingCount = intl.formatMessage({
    defaultMessage: 'Paging count invalid',
    description: 'error message for invalid paging count',
  });
  const pagingCountMax = intl.formatMessage({
    defaultMessage: 'Paging Count exceeds maximum value',
    description: 'error message for max-exceeding paging count',
  });

  const validate = <K extends keyof RootState>(validationType: K, proposedState: RootState[K], nodeId: string): Array<ValidationError> => {
    switch (validationType) {
      case 'operations': {
        const proposedOperationMetadataState = proposedState as OperationMetadataState;
        const errors = validateOperationSettings(proposedOperationMetadataState.settings[nodeId]);
        setValidationErrors(errors);
        return errors;
      }
      default:
        return [];
    }
  };

  const validateOperationSettings = useCallback(
    (settings: Settings): ValidationError[] => {
      const { conditionExpressions, paging } = settings;
      const validationErrors: ValidationError[] = [];

      if (conditionExpressions?.value?.some((conditionExpression) => !conditionExpression)) {
        validationErrors.push({
          key: ValidationErrorKeys.TRIGGER_CONDITION_EMPTY,
          message: triggerConditionEmpty,
        });
      }

      if (paging?.value?.enabled) {
        const { value } = paging.value;
        if (isNaN(Number(value))) {
          validationErrors.push({
            key: ValidationErrorKeys.PAGING_COUNT,
            message: pagingCount,
          });
        } else if (!value || value <= 0 || value > constants.MAX_PAGING_COUNT) {
          validationErrors.push({
            key: ValidationErrorKeys.PAGING_COUNT,
            message: pagingCountMax,
          });
        }
      }

      return validationErrors;
    },
    [pagingCount, pagingCountMax, triggerConditionEmpty]
  );

  return {
    validate,
    validationErrors,
  };
};
