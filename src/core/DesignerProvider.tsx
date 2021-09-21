import { ThemeProvider, Theme } from '@fluentui/react';
import React, { useState, useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import { AzureThemeLight } from '../../azure-themes';
import { store } from './store';
import { Provider } from 'react-redux';
import defaultMessages from '../../compiled-lang/strings.json';
export interface DesignerProviderProps {
  theme?: Theme;
  locale?: string;
  children: React.ReactNode;
}
 
const loadLocaleData = async (locale: string) => {
  switch (locale.split('-')[0].toLowerCase()) {
    case 'fr':
      return import('../../compiled-lang/strings.fr.json');
    case 'en':
      if (locale === 'en-XA') return import('../../compiled-lang/strings.en-XA.json');
      else return import('../../compiled-lang/strings.json');
    case 'cs':
      return import('../../compiled-lang/strings.cs.json');
    case 'de':
      return import('../../compiled-lang/strings.de.json');
    case 'es':
      return import('../../compiled-lang/strings.es.json');
    case 'hu':
      return import('../../compiled-lang/strings.hu.json');
    case 'it':
      return import('../../compiled-lang/strings.it.json');
    case 'ja':
      return import('../../compiled-lang/strings.ja.json');
    case 'ko':
      return import('../../compiled-lang/strings.ko.json');
    case 'nl':
      return import('../../compiled-lang/strings.nl.json');
    case 'pl':
      return import('../../compiled-lang/strings.pl.json');
    case 'pt':
      if (locale === 'pt-BR') return import('../../compiled-lang/strings.pt-BR.json');
      else return import('../../compiled-lang/strings.pt-PT.json');
    case 'ru':
      return import('../../compiled-lang/strings.ru.json');
    case 'sv':
      return import('../../compiled-lang/strings.sv.json');
    case 'tr':
      return import('../../compiled-lang/strings.tr.json');
    case 'zh':
      if (locale === 'zh-Hans') return import('../../compiled-lang/strings.zh-Hans.json');
      else return import('../../compiled-lang/strings.zh-Hant.json');
    default:
      return { default: defaultMessages };
  }
};

export const DesignerProvider = ({ theme = AzureThemeLight, locale = 'en', children }: DesignerProviderProps) => {
  const [messages, setMessages] = useState<any>(undefined);
  useEffect(() => {
    loadLocaleData(locale).then((msg) => {
      setMessages(msg.default);
    });
  }, [locale]);
  return (
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <IntlProvider locale={locale} defaultLocale="en" messages={messages ?? defaultMessages}>
          {children}
        </IntlProvider>
      </Provider>
    </ThemeProvider>
  );
};
