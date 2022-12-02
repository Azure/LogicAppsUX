import { getIntl } from '@microsoft/intl-logic-apps';
import type { Exception } from '@microsoft/utils-logic-apps';
import { isException } from '@microsoft/utils-logic-apps';

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
