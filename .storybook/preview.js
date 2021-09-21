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
  en: require('../compiled-lang/strings.json'),
  'en-xa': require('../compiled-lang/strings.xa.json'),
  'cs-CZ': require('../compiled-lang/strings.cs-CZ'),
  'de-DE': require('../compiled-lang/strings.de-DE'),
  'es-ES': require('../compiled-lang/strings.es-ES'),
  'fr-FR': require('../compiled-lang/strings.fr-FR'),
  'hu-HU': require('../compiled-lang/strings.hu-HU'),
  'id-ID': require('../compiled-lang/strings.id-ID'),
  'it-IT': require('../compiled-lang/strings.it-IT'),
  'ja-JP': require('../compiled-lang/strings.ja-JP'),
  'ko-KR': require('../compiled-lang/strings.ko-KR'),
  'nl-NL': require('../compiled-lang/strings.nl-NL'),
  'pl-PL': require('../compiled-lang/strings.pl-PL'),
  'pt-BR': require('../compiled-lang/strings.pt-BR'),
  'pt-PT': require('../compiled-lang/strings.pt-PT'),
  'ru-RU': require('../compiled-lang/strings.ru-RU'),
  'sv-SE': require('../compiled-lang/strings.sv-SE'),
  'tr-TR': require('../compiled-lang/strings.tr-TR'),
  'zh-CN': require('../compiled-lang/strings.zh-CN'),
  'zh-TW': require('../compiled-lang/strings.zh-TW'),
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
