import React from 'react';
import { initializeIcons, ThemeProvider } from '@fluentui/react';
import { AzureThemeLight } from '../azure-themes';
import { IntlProvider } from 'react-intl';
const theme = AzureThemeLight;

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
const messages = {
  en: require('../compiled-lang/en.json'),
  'en-xa': require('../compiled-lang/en-xa.json'),
  'cs-CZ': require('../compiled-lang/en.cs-CZ'),
  'de-DE': require('../compiled-lang/en.de-DE'),
  'es-ES': require('../compiled-lang/en.es-ES'),
  'fr-FR': require('../compiled-lang/en.fr-FR'),
  'hu-HU': require('../compiled-lang/en.hu-HU'),
  'id-ID': require('../compiled-lang/en.id-ID'),
  'it-IT': require('../compiled-lang/en.it-IT'),
  'ja-JP': require('../compiled-lang/en.ja-JP'),
  'ko-KR': require('../compiled-lang/en.ko-KR'),
  'nl-NL': require('../compiled-lang/en.nl-NL'),
  'pl-PL': require('../compiled-lang/en.pl-PL'),
  'pt-BR': require('../compiled-lang/en.pt-BR'),
  'pt-PT': require('../compiled-lang/en.pt-PT'),
  'ru-RU': require('../compiled-lang/en.ru-RU'),
  'sv-SE': require('../compiled-lang/en.sv-SE'),
  'tr-TR': require('../compiled-lang/en.tr-TR'),
  'zh-CN': require('../compiled-lang/en.zh-CN'),
  'zh-TW': require('../compiled-lang/en.zh-TW'),
};

export const globalTypes = {
  locale: {
    name: 'Locale',
    description: 'Internationalization locale',
    defaultValue: 'en',
    toolbar: {
      icon: 'globe',
      items: [
        { value: 'en', right: 'EN-US', title: 'English' },
        { value: 'en-xa', right: 'EN-XA', title: 'Pseudo English' },
        ...Object.keys(messages)
          .filter((x) => x !== 'en' && x !== 'en-xa')
          .map((x) => ({ value: x, right: x, title: x })),
      ],
    },
  },
};

initializeIcons();
export const decorators = [
  (Story, context) => (
    <ThemeProvider theme={theme}>
      <IntlProvider locale={context.globals.locale} messages={messages[context.globals.locale]}>
        <Story />
      </IntlProvider>
    </ThemeProvider>
  ),
];
