import type { MessageDescriptor } from 'react-intl';

export interface IntlMessage {
  message: MessageDescriptor;
  value?: any;
}
