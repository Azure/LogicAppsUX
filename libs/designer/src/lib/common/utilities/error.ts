import constants from '../constants';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';

export interface ErrorProps {
  errorLevel?: MessageBarType;
  errorMessage?: string;
  code?: string;
  message?: string;
}

/**
 * Translates a monitoring view `errors` prop into designer error props.
 * @arg {{ code: string; message: string }} errorRun - Operation error run object.
 * @arg {string} statusRun - The operation status, e.g., Failed, Succeeded.
 * @arg {string} codeRun - The operation code.
 * @return {ErrorProps | undefined}
 */
export function getMonitoringError(
  errorRun: { code: string; message: string } | undefined,
  statusRun: string | undefined,
  codeRun: string | undefined
): ErrorProps {
  if (!codeRun || statusRun === constants.FLOW_STATUS.SUCCEEDED) {
    return {
      errorLevel: undefined,
      errorMessage: undefined,
      code: undefined,
      message: undefined,
    };
  }

  const { code, message } = errorRun ?? { code: codeRun, message: '' };

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
