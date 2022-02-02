import { Exception, isException } from '@microsoft-logic-apps/utils';
import { getIntl } from '@microsoft-logic-apps/intl';

export function includeInnerExceptionMessage(error: Error | Exception): string {
  const intl = getIntl();
  const defaultErrorMessage = intl.formatMessage({
    defaultMessage: 'Unexpected error',
    description:
      'This is the default message shown in case of an error. It can be shown in multiple contexts but generally would be a notification',
  });
  const messages = [
    ...(error?.message ? [error.message] : []),
    ...(isException(error) && error?.innerException?.message ? [error.innerException.message] : []),
  ];

  return messages.length === 0 ? defaultErrorMessage : messages.join(' ');
}
