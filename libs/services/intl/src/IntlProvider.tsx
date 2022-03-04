import { IntlGlobalProvider } from './intl';
import type { OnErrorFn } from '@formatjs/intl';
import type { MessageFormatElement } from 'react-intl';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';

const queryClient = new QueryClient();

export interface IntlProviderProps {
  locale: string;
  defaultLocale: string;
  onError: OnErrorFn;
}

const loadLocaleData = async (locale: string): Promise<Record<string, string> | Record<string, MessageFormatElement[]>> => {
  let messages: any = {};
  switch (locale.split('-')[0].toLowerCase()) {
    case 'nl':
      messages = await import('./compiled-lang/strings.nl.json');
      break;
    case 'pl':
      messages = await import('./compiled-lang/strings.pl.json');
      break;
    case 'pt':
      if (locale === 'pt-BR') messages = await import('./compiled-lang/strings.pt-BR.json');
      else messages = await import('./compiled-lang/strings.pt-PT.json');
      break;
    case 'ru':
      messages = await import('./compiled-lang/strings.ru.json');
      break;
    case 'sv':
      messages = await import('./compiled-lang/strings.sv.json');
      break;
    case 'tr':
      messages = await import('./compiled-lang/strings.tr.json');
      break;
    case 'zh':
      if (locale === 'zh-Hans') messages = await import('./compiled-lang/strings.zh-Hans.json');
      else messages = await import('./compiled-lang/strings.zh-Hant.json');
      break;
    case 'fr':
      messages = await import('./compiled-lang/strings.fr.json');
      break;
    case 'en':
      if (locale === 'en-XA') messages = await import('./compiled-lang/strings.en-XA.json');
      else messages = await import('./compiled-lang/strings.json');
      break;
    case 'cs':
      messages = await import('./compiled-lang/strings.cs.json');
      break;
    case 'de':
      messages = await import('./compiled-lang/strings.de.json');
      break;
    case 'es':
      messages = await import('./compiled-lang/strings.es.json');
      break;
    case 'hu':
      messages = await import('./compiled-lang/strings.hu.json');
      break;
    case 'it':
      messages = await import('./compiled-lang/strings.it.json');
      break;
    case 'ja':
      messages = await import('./compiled-lang/strings.ja.json');
      break;
    case 'ko':
      messages = await import('./compiled-lang/strings.ko.json');
      break;
    default:
      messages = await import('./compiled-lang/strings.json');
      break;
  }
  return { ...messages };
};

const IntlProviderInner: React.FC<IntlProviderProps> = ({ locale, defaultLocale, children, onError }) => {
  const { data } = useQuery(['localizationMessages', locale], async () => {
    const messages = await loadLocaleData(locale);
    return { ...messages };
  });

  return (
    <ReactIntlProvider locale={locale} defaultLocale={defaultLocale} messages={data} onError={onError}>
      <IntlGlobalProvider>{children}</IntlGlobalProvider>
    </ReactIntlProvider>
  );
};
export const IntlProvider: React.FC<IntlProviderProps> = (props) => {
  return (
    <QueryClientProvider client={queryClient}>
      <IntlProviderInner {...props} />
    </QueryClientProvider>
  );
};
