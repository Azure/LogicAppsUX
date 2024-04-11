import type { MessageDescriptor } from 'react-intl';

export interface IntlMessage {
  /**
   * This should be the message descriptor that is returned from defineMessages()
   */
  message: MessageDescriptor;
  value?: any;
}
