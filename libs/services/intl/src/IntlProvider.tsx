import { IntlGlobalProvider } from './intl';
import { IntlProvider as ReactIntlProvider, MessageFormatElement } from 'react-intl';
import { OnErrorFn } from '@formatjs/intl';

export interface IntlProviderProps {
  locale: string;
  defaultLocale: string;
  messages: Record<string, string> | Record<string, MessageFormatElement[]>;
  children: React.ReactNode;
  onError: OnErrorFn;
}

export const IntlProvider = ({ locale, defaultLocale, messages, children, onError }: IntlProviderProps) => {
  return (
    <ReactIntlProvider locale={locale} defaultLocale={defaultLocale} messages={messages} onError={onError}>
      <IntlGlobalProvider>{children}</IntlGlobalProvider>
    </ReactIntlProvider>
  );
};
