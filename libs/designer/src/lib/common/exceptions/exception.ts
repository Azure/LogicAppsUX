import { getIntl } from '../../common/i18n/intl';
import { Exception, isException } from '@microsoft-logic-apps/utils';

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
  });
  const messages = [
    ...(error?.message ? [error.message] : []),
    ...(isException(error) && error?.innerException?.message ? [error.innerException.message] : []),
  ];

  return messages.length === 0 ? defaultErrorMessage : messages.join(' ');
}