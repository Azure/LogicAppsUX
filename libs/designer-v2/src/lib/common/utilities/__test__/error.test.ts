import { describe, it, expect } from 'vitest';
import { extractErrorInfo, getMonitoringError, getMonitoringTabError, ErrorRun } from '../error';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';
import constants from '../../constants';

// Common test data
const TEST_CODES = {
  TEST: 'TEST_CODE',
  FALLBACK: 'FALLBACK_CODE',
  FAIL: 'FAIL_CODE',
  SKIP: 'SKIP_CODE',
  ERROR: 'ERROR_CODE',
  TIMEOUT: 'TIMEOUT_ERROR',
  WRAPPED: 'WRAPPED_CODE',
  COMPLEX: 'COMPLEX_ERROR',
  PARTIAL: 'PARTIAL_ERROR',
  PLAIN: 'PLAIN_ERROR',
  CUSTOM: 'CUSTOM_ERROR',
  ONLY: 'ONLY_CODE',
} as const;

const TEST_MESSAGES = {
  TEST: 'Test message',
  FAILED: 'Failed message',
  SKIPPED: 'Skipped message',
  ERROR: 'Error message',
  CUSTOM: 'Custom error message',
  COMPLEX: 'Complex error message',
  WRAPPED: 'Wrapped message',
  FOUNDRY: "Creating foundry agent failed with status: '401' and message: 'The principal lacks required permissions'",
  CONNECTION: 'Connection failed with 401 unauthorized',
  ONLY_MESSAGE: 'Only message here',
  WITHOUT_CODE: 'Error without code',
  TIMEOUT: 'Request timed out after 30 seconds',
  OPERATION_SKIPPED: 'Operation skipped',
  OPERATION_FAILED: 'Failed operation',
} as const;

const TEST_ERROR_RUNS = {
  BASIC: { code: TEST_CODES.TEST, message: TEST_MESSAGES.TEST },
  FAIL: { code: TEST_CODES.FAIL, message: TEST_MESSAGES.FAILED },
  SKIP: { code: TEST_CODES.SKIP, message: TEST_MESSAGES.SKIPPED },
  EMPTY_CODE: { code: '', message: TEST_MESSAGES.ONLY_MESSAGE },
  EMPTY_MESSAGE: { code: TEST_CODES.ONLY, message: '' },
  BOTH_EMPTY: { code: '', message: '' },
  TIMEOUT: { code: TEST_CODES.TIMEOUT, message: TEST_MESSAGES.TIMEOUT },
  OPERATION_FAILED: { code: TEST_CODES.FAIL, message: TEST_MESSAGES.OPERATION_FAILED },
  OPERATION_SKIPPED: { code: TEST_CODES.SKIP, message: TEST_MESSAGES.OPERATION_SKIPPED },
  WITHOUT_CODE: { code: '', message: TEST_MESSAGES.WITHOUT_CODE },
} as const;

const EXPECTED_EMPTY_ERROR_PROPS = {
  errorLevel: undefined,
  errorMessage: undefined,
  code: undefined,
  message: undefined,
} as const;

describe('extractErrorInfo', () => {
  it('should return code and empty message when errorRun is undefined', () => {
    const result = extractErrorInfo(undefined, TEST_CODES.TEST);
    expect(result).toEqual({
      code: TEST_CODES.TEST,
      message: '',
    });
  });

  it('should return code and empty message when errorRun is null', () => {
    const result = extractErrorInfo(null as any, TEST_CODES.TEST);
    expect(result).toEqual({
      code: TEST_CODES.TEST,
      message: '',
    });
  });

  it('should handle string errorRun', () => {
    const result = extractErrorInfo(TEST_MESSAGES.FOUNDRY as any, 'ORIGINAL_CODE');
    expect(result).toEqual({
      code: 'error',
      message: TEST_MESSAGES.FOUNDRY,
    });
  });

  it('should handle ErrorRun object directly', () => {
    const errorRun: ErrorRun = {
      code: TEST_CODES.CUSTOM,
      message: TEST_MESSAGES.CUSTOM,
    };
    const result = extractErrorInfo(errorRun, TEST_CODES.FALLBACK);
    expect(result).toEqual({
      code: TEST_CODES.CUSTOM,
      message: TEST_MESSAGES.CUSTOM,
    });
  });

  it('should handle wrapped ErrorRun object', () => {
    const wrappedError = {
      error: {
        code: TEST_CODES.WRAPPED,
        message: TEST_MESSAGES.WRAPPED,
      },
    };
    const result = extractErrorInfo(wrappedError, TEST_CODES.FALLBACK);
    expect(result).toEqual({
      code: TEST_CODES.WRAPPED,
      message: TEST_MESSAGES.WRAPPED,
    });
  });

  it('should handle empty string errorRun', () => {
    const result = extractErrorInfo('' as any, TEST_CODES.FALLBACK);
    expect(result).toEqual({
      code: TEST_CODES.FALLBACK,
      message: '',
    });
  });

  it('should handle non-string, non-object values', () => {
    const result = extractErrorInfo(123 as any, TEST_CODES.FALLBACK);
    expect(result).toEqual({
      code: 'unknown',
      message: '123',
    });
  });

  it('should handle boolean errorRun', () => {
    const result = extractErrorInfo(true as any, TEST_CODES.FALLBACK);
    expect(result).toEqual({
      code: 'unknown',
      message: 'true',
    });
  });

  it('should handle plain object without error property', () => {
    const plainObject = {
      code: TEST_CODES.PLAIN,
      message: 'Plain object error',
    };
    const result = extractErrorInfo(plainObject as any, TEST_CODES.FALLBACK);
    expect(result).toEqual({
      code: TEST_CODES.PLAIN,
      message: 'Plain object error',
    });
  });

  it('should handle object with partial ErrorRun structure', () => {
    const partialError = {
      code: TEST_CODES.PARTIAL,
      // missing message property
    };
    const result = extractErrorInfo(partialError as any, TEST_CODES.FALLBACK);
    expect(result).toEqual({
      code: TEST_CODES.PARTIAL,
    });
  });

  it('should handle nested error object with extra properties', () => {
    const complexError = {
      error: {
        code: TEST_CODES.COMPLEX,
        message: TEST_MESSAGES.COMPLEX,
        timestamp: '2023-01-01',
        severity: 'high',
      },
      context: 'some context',
    };
    const result = extractErrorInfo(complexError as any, TEST_CODES.FALLBACK);
    expect(result).toEqual({
      code: TEST_CODES.COMPLEX,
      message: TEST_MESSAGES.COMPLEX,
      timestamp: '2023-01-01',
      severity: 'high',
    });
  });
});

describe('getMonitoringError', () => {
  it('should return empty error properties when codeRun is undefined', () => {
    const result = getMonitoringError(undefined, 'Failed', undefined);
    expect(result).toEqual(EXPECTED_EMPTY_ERROR_PROPS);
  });

  it('should return empty error properties when status is Succeeded', () => {
    const result = getMonitoringError(TEST_ERROR_RUNS.BASIC, constants.FLOW_STATUS.SUCCEEDED, 'CODE_RUN');
    expect(result).toEqual(EXPECTED_EMPTY_ERROR_PROPS);
  });

  it('should return empty error properties when status is Running', () => {
    const result = getMonitoringError(TEST_ERROR_RUNS.BASIC, constants.FLOW_STATUS.RUNNING, 'CODE_RUN');
    expect(result).toEqual(EXPECTED_EMPTY_ERROR_PROPS);
  });

  it('should return info level error for skipped status', () => {
    const result = getMonitoringError(TEST_ERROR_RUNS.SKIP, constants.FLOW_STATUS.SKIPPED, 'CODE_RUN');
    expect(result).toEqual({
      errorLevel: MessageBarType.info,
      errorMessage: `${TEST_CODES.SKIP}. ${TEST_MESSAGES.SKIPPED}`,
      code: TEST_CODES.SKIP,
      message: TEST_MESSAGES.SKIPPED,
    });
  });

  it('should return severe warning level error for failed status', () => {
    const result = getMonitoringError(TEST_ERROR_RUNS.FAIL, constants.FLOW_STATUS.FAILED, 'CODE_RUN');
    expect(result).toEqual({
      errorLevel: MessageBarType.severeWarning,
      errorMessage: `${TEST_CODES.FAIL}. ${TEST_MESSAGES.FAILED}`,
      code: TEST_CODES.FAIL,
      message: TEST_MESSAGES.FAILED,
    });
  });

  it('should format error message with only message when code is empty', () => {
    const result = getMonitoringError(TEST_ERROR_RUNS.EMPTY_CODE, constants.FLOW_STATUS.FAILED, 'CODE_RUN');
    expect(result).toEqual({
      errorLevel: MessageBarType.severeWarning,
      errorMessage: TEST_MESSAGES.ONLY_MESSAGE,
      code: '',
      message: TEST_MESSAGES.ONLY_MESSAGE,
    });
  });

  it('should format error message with only code when message is empty', () => {
    const result = getMonitoringError(TEST_ERROR_RUNS.EMPTY_MESSAGE, constants.FLOW_STATUS.FAILED, 'CODE_RUN');
    expect(result).toEqual({
      errorLevel: MessageBarType.severeWarning,
      errorMessage: TEST_CODES.ONLY,
      code: TEST_CODES.ONLY,
      message: '',
    });
  });

  it('should handle wrapped error object', () => {
    const wrappedError = {
      error: {
        code: TEST_CODES.WRAPPED,
        message: TEST_MESSAGES.WRAPPED,
      },
    };
    const result = getMonitoringError(wrappedError, constants.FLOW_STATUS.FAILED, 'CODE_RUN');
    expect(result).toEqual({
      errorLevel: MessageBarType.severeWarning,
      errorMessage: `${TEST_CODES.WRAPPED}. ${TEST_MESSAGES.WRAPPED}`,
      code: TEST_CODES.WRAPPED,
      message: TEST_MESSAGES.WRAPPED,
    });
  });

  it('should handle string error (via extractErrorInfo)', () => {
    const result = getMonitoringError(TEST_MESSAGES.CONNECTION as any, constants.FLOW_STATUS.FAILED, 'CODE_RUN');
    expect(result).toEqual({
      errorLevel: MessageBarType.severeWarning,
      errorMessage: `error. ${TEST_MESSAGES.CONNECTION}`,
      code: 'error',
      message: TEST_MESSAGES.CONNECTION,
    });
  });

  it('should fallback to codeRun when errorRun is undefined', () => {
    const result = getMonitoringError(undefined, constants.FLOW_STATUS.FAILED, TEST_CODES.FALLBACK);
    expect(result).toEqual({
      errorLevel: MessageBarType.severeWarning,
      errorMessage: TEST_CODES.FALLBACK,
      code: TEST_CODES.FALLBACK,
      message: '',
    });
  });

  it('should handle undefined statusRun with default severe warning', () => {
    const result = getMonitoringError(TEST_ERROR_RUNS.BASIC, undefined, 'CODE_RUN');
    expect(result).toEqual({
      errorLevel: MessageBarType.severeWarning,
      errorMessage: `${TEST_CODES.TEST}. ${TEST_MESSAGES.TEST}`,
      code: TEST_CODES.TEST,
      message: TEST_MESSAGES.TEST,
    });
  });
});

describe('getMonitoringTabError', () => {
  it('should return undefined when message is null', () => {
    const result = getMonitoringTabError(undefined, constants.FLOW_STATUS.SUCCEEDED, 'CODE_RUN');
    expect(result).toBeUndefined();
  });

  it('should return undefined when message is undefined from getMonitoringError', () => {
    const result = getMonitoringTabError(TEST_ERROR_RUNS.BASIC, constants.FLOW_STATUS.SUCCEEDED, undefined);
    expect(result).toBeUndefined();
  });

  it('should return formatted error object for valid error', () => {
    const result = getMonitoringTabError(TEST_ERROR_RUNS.OPERATION_FAILED, constants.FLOW_STATUS.FAILED, 'CODE_RUN');
    expect(result).toEqual({
      code: TEST_CODES.FAIL,
      message: TEST_MESSAGES.OPERATION_FAILED,
      messageBarType: MessageBarType.severeWarning,
    });
  });

  it('should return formatted error object for skipped status with info level', () => {
    const result = getMonitoringTabError(TEST_ERROR_RUNS.OPERATION_SKIPPED, constants.FLOW_STATUS.SKIPPED, 'CODE_RUN');
    expect(result).toEqual({
      code: TEST_CODES.SKIP,
      message: TEST_MESSAGES.OPERATION_SKIPPED,
      messageBarType: MessageBarType.info,
    });
  });

  it('should handle error with empty code but valid message', () => {
    const result = getMonitoringTabError(TEST_ERROR_RUNS.WITHOUT_CODE, constants.FLOW_STATUS.FAILED, 'CODE_RUN');
    expect(result).toEqual({
      code: '',
      message: TEST_MESSAGES.WITHOUT_CODE,
      messageBarType: MessageBarType.severeWarning,
    });
  });

  it('should handle error with valid code but empty message', () => {
    const result = getMonitoringTabError(TEST_ERROR_RUNS.EMPTY_MESSAGE, constants.FLOW_STATUS.FAILED, 'CODE_RUN');
    expect(result).toEqual({
      code: TEST_CODES.ONLY,
      message: '',
      messageBarType: MessageBarType.severeWarning,
    });
  });

  it('should return error object when both message and code are empty strings', () => {
    const result = getMonitoringTabError(TEST_ERROR_RUNS.BOTH_EMPTY, constants.FLOW_STATUS.FAILED, 'CODE_RUN');
    expect(result).toEqual({
      code: '',
      message: '',
      messageBarType: MessageBarType.severeWarning,
    });
  });

  it('should handle complex error scenarios', () => {
    const result = getMonitoringTabError(TEST_ERROR_RUNS.TIMEOUT, constants.FLOW_STATUS.TIMEDOUT, 'TIMEOUT_CODE');
    expect(result).toEqual({
      code: TEST_CODES.TIMEOUT,
      message: TEST_MESSAGES.TIMEOUT,
      messageBarType: MessageBarType.severeWarning,
    });
  });
});
