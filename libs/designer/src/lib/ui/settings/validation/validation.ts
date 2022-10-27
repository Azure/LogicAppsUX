import constants from '../../../common/constants';
import type { RootState } from '../../../core';
import type { Settings } from '../../../core/actions/bjsworkflow/settings';
import type { OperationMetadataState } from '../../../core/state/operation/operationMetadataSlice';
import { ValidationErrorKeys, type ValidationError } from '../../../core/state/settingSlice';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

const ISO_8601_REGEX = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d+[HMS])(\d+H)?(\d+M)?(\d+S)?)?$/;

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
    defaultMessage: 'Paging count exceeds maximum value',
    description: 'error message for max-exceeding paging count',
  });

  const retryCountInvalidText = intl.formatMessage(
    {
      defaultMessage: 'Retry Policy count is invalid (Must be from {min} to {max})',
      description: 'error message for invalid retry count',
    },
    {
      min: constants.RETRY_POLICY_LIMITS.MIN_COUNT,
      max: constants.RETRY_POLICY_LIMITS.MAX_COUNT,
    }
  );
  const retryIntervalEmptyText = intl.formatMessage({
    defaultMessage: 'Retry Policy interval cannot be empty',
    description: 'error message for empty retry interval',
  });
  const retryIntervalInvalidText = intl.formatMessage({
    defaultMessage: 'Retry Policy interval is invalid, must match ISO 8601 duration format',
    description: 'error message for invalid retry interval',
  });

  const validateOperationSettings = useCallback(
    (settings?: Settings): ValidationError[] => {
      const { conditionExpressions, paging, retryPolicy } = settings ?? {};
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

      if (retryPolicy?.isSupported) {
        if (
          retryPolicy?.value?.type === constants.RETRY_POLICY_TYPE.EXPONENTIAL ||
          retryPolicy?.value?.type === constants.RETRY_POLICY_TYPE.FIXED
        ) {
          // Invalid retry count
          const retryCount = Number(retryPolicy?.value?.count);
          if (
            isNaN(retryCount) ||
            retryCount < constants.RETRY_POLICY_LIMITS.MIN_COUNT ||
            retryCount > constants.RETRY_POLICY_LIMITS.MAX_COUNT
          ) {
            validationErrors.push({
              key: ValidationErrorKeys.RETRY_COUNT_INVALID,
              message: retryCountInvalidText,
            });
          }
          // Empty retry interval
          if (!retryPolicy?.value?.interval) {
            validationErrors.push({
              key: ValidationErrorKeys.RETRY_INTERVAL_EMPTY,
              message: retryIntervalEmptyText,
            });
          }
          // Invalid retry interval
          if (!ISO_8601_REGEX.test(retryPolicy?.value?.interval ?? '')) {
            validationErrors.push({
              key: ValidationErrorKeys.RETRY_INTERVAL_INVALID,
              message: retryIntervalInvalidText,
            });
          }
        }
      }
      return validationErrors;
    },
    [pagingCount, pagingCountMax, retryCountInvalidText, retryIntervalEmptyText, retryIntervalInvalidText, triggerConditionEmpty]
  );

  const validate = useCallback(
    <K extends keyof RootState>(validationType: K, proposedState: RootState[K], nodeId: string): ValidationError[] => {
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
    },
    [validateOperationSettings]
  );

  return {
    validate,
    validationErrors,
  };
};
