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
  en: { right: 'EN-US', title: 'English', data: require('../compiled-lang/strings.json') },
  'en-xa': { right: 'EN-XA', title: 'PseudoLoc', data: require('../compiled-lang/strings.xa.json') },
  'cs-CZ': { right: 'CS-CZ', title: 'Czech', data: require('../compiled-lang/strings.cs.json') },
  'de-DE': { right: 'DE-DE', title: 'German', data: require('../compiled-lang/strings.de.json') },
  'es-ES': { right: 'ES-ES', title: 'Spanish', data: require('../compiled-lang/strings.es.json') },
  'fr-FR': { right: 'FR-FR', title: 'French', data: require('../compiled-lang/strings.fr.json') },
  'hu-HU': { right: 'HU-HU', title: 'Hungarian', data: require('../compiled-lang/strings.hu.json') },
  'id-ID': { right: 'ID-ID', title: 'Indonesion', data: require('../compiled-lang/strings.id.json') },
  'it-IT': { right: 'IT-IT', title: 'Italian', data: require('../compiled-lang/strings.it.json') },
  'ja-JP': { right: 'JP-JP', title: 'Japanese', data: require('../compiled-lang/strings.ja.json') },
  'ko-KR': { right: 'KO-KR', title: 'Korean', data: require('../compiled-lang/strings.ko.json') },
  'nl-NL': { right: 'NL-NL', title: 'Dutch', data: require('../compiled-lang/strings.nl.json') },
  'pl-PL': { right: 'PL-PL', title: 'Polish', data: require('../compiled-lang/strings.pl.json') },
  'pt-BR': { right: 'PT-NR', title: 'Portuguese - Brazil', data: require('../compiled-lang/strings.pt-BR.json') },
  'pt-PT': { right: 'PT-PT', title: 'Portuguese - Portugal', data: require('../compiled-lang/strings.pt-PT.json') },
  'ru-RU': { right: 'RU-RU', title: 'Russian', data: require('../compiled-lang/strings.ru.json') },
  'sv-SE': { right: 'SV-SE', title: 'Swedish', data: require('../compiled-lang/strings.sv.json') },
  'tr-TR': { right: 'TR-TR', title: 'Turkish', data: require('../compiled-lang/strings.tr.json') },
  'zh-Hans': { right: 'ZH-HANS', title: 'Chinese - Simplified', data: require('../compiled-lang/strings.zh-Hans.json') },
  'zh-Hant': { right: 'ZH-HANT', title: 'Chinese - Traditional', data: require('../compiled-lang/strings.zh-Hant.json') },
};

export const globalTypes = {
  locale: {
    name: 'Locale',
    description: 'Internationalization locale',
    defaultValue: 'en',
    toolbar: {
      icon: 'globe',
      items: [
        ...Object.entries(messages).map(([key, value]) => ({
          value: { loc: key, data: value.data },
          right: value.right,
          title: value.title,
        })),
      ],
    },
  },
};

initializeIcons();
export const decorators = [
  (Story, context) => (
    <ThemeProvider theme={theme}>
      <IntlProvider locale={context.globals.locale.loc} messages={context.globals.locale.data}>
        <Story />
      </IntlProvider>
    </ThemeProvider>
  ),
];
