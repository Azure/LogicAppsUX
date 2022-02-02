import { IntlGlobalProvider } from './intl';
import { IntlProvider as ReactIntlProvider, MessageFormatElement } from 'react-intl';

export interface IntlProviderProps {
  locale: string;
  defaultLocale: string;
  messages: Record<string, string> | Record<string, MessageFormatElement[]>;
  children: React.ReactNode;
}

export const IntlProvider = ({ locale, defaultLocale, messages, children }: IntlProviderProps) => {
  return (
    <ReactIntlProvider
      locale={locale}
      defaultLocale={defaultLocale}
      messages={messages}
      onError={(err) => {
        if (err.code === 'MISSING_TRANSLATION') {
          return;
        }
        throw err;
      }}
    >
      <IntlGlobalProvider>{children}</IntlGlobalProvider>
    </ReactIntlProvider>
  );
};
