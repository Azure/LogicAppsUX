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
