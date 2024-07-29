import { SettingSectionName } from '..';
import constants from '../../../common/constants';
import type { AppDispatch } from '../../../core';
import type { Settings } from '../../../core/actions/bjsworkflow/settings';
import { setValidationError } from '../../../core/state/setting/settingSlice';
import { isISO8601 } from '../../../core/utils/validation';
import { getIntl, isTemplateExpression } from '@microsoft/logic-apps-shared';

export const ValidationErrorKeys = {
  CHUNK_SIZE_INVALID: 'ChunkSizeInvalid',
  PAGING_COUNT: 'PagingCount',
  RETRY_COUNT_INVALID: 'RetryCountInvalid',
  RETRY_INTERVAL_INVALID: 'RetryIntervalInvalid',
  SINGLE_INSTANCE_SPLITON: 'SingleInstanceSplitOn',
  TRIGGER_CONDITION_EMPTY: 'TriggerConditionEmpty',
  TIMEOUT_VALUE_INVALID: 'TimeoutValueInvalid',
  CANNOT_DELETE_LAST_ACTION: 'CannotDeleteLastAction',
  CANNOT_DELETE_LAST_STATUS: 'CannotDeleteLastStatus',
} as const;
export type ValidationErrorKeys = (typeof ValidationErrorKeys)[keyof typeof ValidationErrorKeys];

export const ValidationErrorType = {
  WARNING: 'Warning',
  ERROR: 'Error',
  INFO: 'Info',
} as const;
export type ValidationErrorType = (typeof ValidationErrorType)[keyof typeof ValidationErrorType];

export interface ValidationError {
  key: ValidationErrorKeys;
  errorType: ValidationErrorType;
  message: string;
}

export const validateNodeSettings = (
  selectedNode: string,
  settingsToValidate: Settings,
  settingSection: SettingSectionName,
  dispatch: AppDispatch
) => {
  const intl = getIntl();

  const triggerConditionEmpty = intl.formatMessage({
    defaultMessage: 'Trigger condition cannot be empty',
    id: 'DsPDVB',
    description: 'error message for empty trigger condition',
  });
  const pagingCount = intl.formatMessage({
    defaultMessage: 'Paging count invalid. Value must be a number greater than 0',
    id: '2pCFsW',
    description: 'error message for invalid paging count',
  });
  const pagingCountMax = intl.formatMessage(
    {
      defaultMessage: 'Paging count exceeds maximum value of {max}',
      id: 'QhKk80',
      description: 'error message for max-exceeding paging count',
    },
    { max: constants.MAX_PAGING_COUNT }
  );

  const retryCountInvalidText = intl.formatMessage(
    {
      defaultMessage: 'Retry policy count is invalid (must be from {min} to {max})',
      id: '/csbOB',
      description: 'error message for invalid retry count',
    },
    {
      min: constants.RETRY_POLICY_LIMITS.MIN_COUNT,
      max: constants.RETRY_POLICY_LIMITS.MAX_COUNT,
    }
  );
  const retryIntervalInvalidText = intl.formatMessage({
    defaultMessage: 'Retry policy interval is invalid, must match ISO 8601 duration format',
    id: '+R90eK',
    description: 'error message for invalid retry interval',
  });

  const retryMinIntervalInvalidText = intl.formatMessage({
    defaultMessage: 'Retry policy minimum interval is invalid, must match ISO 8601 duration format',
    id: 'Bkc/+3',
    description: 'error message for invalid minimum retry interval',
  });

  const retryMaxIntervalInvalidText = intl.formatMessage({
    defaultMessage: 'Retry policy maximum interval is invalid, must match ISO 8601 duration format',
    id: 'aJg1gl',
    description: 'error message for maximum invalid retry interval',
  });

  const requestOptionsInvalidText = intl.formatMessage({
    defaultMessage: 'Timeout value is invalid, must match ISO 8601 duration format',
    id: '6VV7OY',
    description: 'error message for invalid timeout value',
  });

  const validationErrors: ValidationError[] = [];

  switch (settingSection) {
    case SettingSectionName.GENERAL: {
      {
        const { conditionExpressions } = settingsToValidate;
        if (conditionExpressions?.value?.some((conditionExpression) => !conditionExpression)) {
          validationErrors.push({
            key: ValidationErrorKeys.TRIGGER_CONDITION_EMPTY,
            errorType: ValidationErrorType.ERROR,
            message: triggerConditionEmpty,
          });
        }
      }
      break;
    }
    case SettingSectionName.NETWORKING: {
      {
        const { paging, retryPolicy, requestOptions } = settingsToValidate;
        if (paging?.value?.enabled) {
          const { value } = paging.value;
          if (Number.isNaN(Number(value)) || !value || value <= 0) {
            validationErrors.push({
              key: ValidationErrorKeys.PAGING_COUNT,
              errorType: ValidationErrorType.ERROR,
              message: pagingCount,
            });
          } else if (value > constants.MAX_PAGING_COUNT) {
            validationErrors.push({
              key: ValidationErrorKeys.PAGING_COUNT,
              errorType: ValidationErrorType.ERROR,
              message: pagingCountMax,
            });
          }
        }
        if (retryPolicy?.isSupported && retryPolicy.value) {
          const { count, type, interval, minimumInterval, maximumInterval } = retryPolicy.value;
          if (type === constants.RETRY_POLICY_TYPE.EXPONENTIAL || type === constants.RETRY_POLICY_TYPE.FIXED) {
            const retryCount = Number(count);
            // Invalid retry count
            if (
              (!isTemplateExpression(count?.toString() ?? '') && Number.isNaN(retryCount)) ||
              retryCount < constants.RETRY_POLICY_LIMITS.MIN_COUNT ||
              retryCount > constants.RETRY_POLICY_LIMITS.MAX_COUNT
            ) {
              validationErrors.push({
                key: ValidationErrorKeys.RETRY_COUNT_INVALID,
                errorType: ValidationErrorType.ERROR,
                message: retryCountInvalidText,
              });
            }
            // Invalid retry interval
            if (!isTemplateExpression(interval?.toString() ?? '') && !isISO8601(retryPolicy?.value?.interval ?? '')) {
              validationErrors.push({
                key: ValidationErrorKeys.RETRY_INTERVAL_INVALID,
                errorType: ValidationErrorType.ERROR,
                message: retryIntervalInvalidText,
              });
            }
            if (minimumInterval && !isTemplateExpression(minimumInterval.toString()) && !isISO8601(minimumInterval)) {
              validationErrors.push({
                key: ValidationErrorKeys.RETRY_INTERVAL_INVALID,
                errorType: ValidationErrorType.ERROR,
                message: retryMinIntervalInvalidText,
              });
            }
            if (maximumInterval && !isTemplateExpression(maximumInterval.toString()) && !isISO8601(maximumInterval)) {
              validationErrors.push({
                key: ValidationErrorKeys.RETRY_INTERVAL_INVALID,
                errorType: ValidationErrorType.ERROR,
                message: retryMaxIntervalInvalidText,
              });
            }
          }
        }
        if (requestOptions?.isSupported && requestOptions.value?.timeout && !isISO8601(requestOptions.value.timeout)) {
          validationErrors.push({
            key: ValidationErrorKeys.TIMEOUT_VALUE_INVALID,
            errorType: ValidationErrorType.ERROR,
            message: requestOptionsInvalidText,
          });
        }
      }
      break;
    }
  }
  dispatch(setValidationError({ nodeId: selectedNode, errors: validationErrors }));
};
