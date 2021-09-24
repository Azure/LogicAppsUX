import { getIntl } from '@designer/common/i18n/intl';
export interface Exception {
  name: string;
  code?: string;
  message: string;
  data?: Record<string, any> /* tslint:disable-line: no-any */;
  // NOTE(prshrest): any is used as a fallback in case it is not an Exception.
  innerException?: Exception | any /* tslint:disable-line: no-any */;
  stack?: string;
}

/**
 * Return a string with the error message and the inner exception message if the error has an inner exception.
 * Otherwise return the error message.
 * @arg {Error | Exception} error - The error or exception object.
 * @return {string}
 */
export function includeInnerExceptionMessage(error: Error | Exception): string {
  const intl = getIntl();
  const defaultErrorMessage = intl.formatMessage({
    defaultMessage: 'Unexpected error',
    id: '1rlBUx',
  });
  const messages = [
    ...(error?.message ? [error.message] : []),
    ...(isException(error) && error?.innerException?.message ? [error.innerException.message] : []),
  ];

  return messages.length === 0 ? defaultErrorMessage : messages.join(' ');
}

// tslint:disable-next-line: no-any
export function isException(value: any): value is Exception {
  return (
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    (value.code === undefined || typeof value.code === 'string') &&
    typeof value.message === 'string' &&
    (value.data === undefined || typeof value.data === 'object') &&
    (value.stack === undefined || typeof value.stack === 'string')
  );
}
