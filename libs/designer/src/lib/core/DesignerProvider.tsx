import { ProviderWrappedContext } from './ProviderWrappedContext';
import { store } from './store';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import type { Theme } from '@fluentui/react';
import { ThemeProvider } from '@fluentui/react';
import { IntlProvider } from '@microsoft-logic-apps/intl';
import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';

export interface DesignerProviderProps {
  theme?: Theme;
  locale?: string;
  children: React.ReactNode;
}

export const DesignerProvider = ({ theme = AzureThemeLight, locale = 'en', children }: DesignerProviderProps) => {
  return (
    <ReduxProvider store={store}>
      <ProviderWrappedContext.Provider value={true}>
        <ThemeProvider theme={theme} className="msla-theme-provider">
          <IntlProvider
            locale={locale}
            defaultLocale={locale}
            onError={(err) => {
              if (err.code === 'MISSING_TRANSLATION') {
                return;
              }
              throw err;
            }}
          >
            {children}
          </IntlProvider>
        </ThemeProvider>
      </ProviderWrappedContext.Provider>
    </ReduxProvider>
  );
};
