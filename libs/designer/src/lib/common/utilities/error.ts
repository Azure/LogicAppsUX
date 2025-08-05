import constants from '../constants';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';

export interface ErrorProps {
  errorLevel?: MessageBarType;
  errorMessage?: string;
  code?: string;
  message?: string;
}

export interface ErrorRun {
  code: string;
  message: string;
}

/**
 * Extracts and formats monitoring error information from a workflow run.
 *
 * @param errorRun - The error object from the run, can be wrapped in an object with 'error' property or be the ErrorRun itself
 * @param statusRun - The status of the workflow run (e.g., 'Succeeded', 'Failed', 'Skipped')
 * @param codeRun - The error code from the workflow run
 * @returns An ErrorProps object containing:
 *   - errorLevel: The severity level of the error (MessageBarType)
 *   - errorMessage: A formatted error message combining code and message
 *   - code: The extracted error code
 *   - message: The extracted error message
 *
 * @remarks
 * - Returns empty error properties if no error code is provided or if the run succeeded/is running
 * - Sets info level for skipped runs, severe warning for all other error cases
 * - Formats the error message based on available code and message content
 */
export function getMonitoringError(
  errorRun: { error: ErrorRun } | ErrorRun | undefined,
  statusRun: string | undefined,
  codeRun: string | undefined
): ErrorProps {
  if (!codeRun || statusRun === constants.FLOW_STATUS.SUCCEEDED || statusRun === constants.FLOW_STATUS.RUNNING) {
    return {
      errorLevel: undefined,
      errorMessage: undefined,
      code: undefined,
      message: undefined,
    };
  }

  const { code, message } = extractErrorInfo(errorRun, codeRun);

  let errorLevel: MessageBarType;
  if (statusRun === constants.FLOW_STATUS.SKIPPED) {
    errorLevel = MessageBarType.info;
  } else {
    errorLevel = MessageBarType.severeWarning;
  }

  let errorMessage: string;
  if (!code && message) {
    errorMessage = message;
  } else if (!message && code) {
    errorMessage = code;
  } else {
    errorMessage = `${code}. ${message}`;
  }

  return {
    errorLevel,
    errorMessage,
    code,
    message,
  };
}

/**
 * Processes monitoring error data and returns a formatted error object for display in the monitoring tab.
 *
 * @param errorRun - The error object containing code and message, or undefined if no error
 * @param errorRun.code - The error code
 * @param errorRun.message - The error message
 * @param statusRun - The status of the run, or undefined
 * @param codeRun - The code of the run, or undefined
 * @returns An object containing the error code, message, and message bar type for display,
 *          or undefined if no valid error message is found
 */
export const getMonitoringTabError = (
  errorRun: { code: string; message: string } | undefined,
  statusRun: string | undefined,
  codeRun: string | undefined
) => {
  const { errorLevel, code, message } = getMonitoringError(errorRun, statusRun, codeRun);

  if (isNullOrUndefined(message)) {
    return undefined;
  }

  return {
    code: code as string,
    message: message as string,
    messageBarType: errorLevel,
  };
};

/**
 * Extracts error information from various error formats and normalizes it into a consistent structure.
 * @param errorRun - The error object which can be:
 *   - An object containing an error property of type ErrorRun
 *   - An ErrorRun object directly
 *   - A string error message
 *   - undefined
 * @param codeRun - Optional error code to use when errorRun is undefined
 * @returns An object containing:
 *   - code: The error code (defaults to 'error' for strings, 'unknown' for unhandled types, or codeRun if errorRun is undefined)
 *   - message: The error message (empty string if errorRun is undefined)
 */
export const extractErrorInfo = (errorRun: { error: ErrorRun } | ErrorRun | undefined, codeRun: string | undefined) => {
  if (!errorRun) {
    return { code: codeRun, message: '' };
  }

  if (typeof errorRun === 'string') {
    return { code: 'error', message: errorRun };
  }

  if (typeof errorRun === 'object' && errorRun !== null) {
    if ('error' in errorRun) {
      return errorRun.error;
    }
    return errorRun;
  }

  return { code: 'unknown', message: String(errorRun) };
};
