import { Exception, isException } from '@microsoft-logic-apps/utils';
import { getIntl } from '../i18n/intl';

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