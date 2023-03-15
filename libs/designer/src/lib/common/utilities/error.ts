import constants from '../constants';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';

export interface ErrorProps {
  errorLevel?: MessageBarType;
  errorMessage?: string;
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
  };
}
