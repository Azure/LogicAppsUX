import { ThemeProvider, Theme } from '@fluentui/react';
import React from 'react';
import { IntlProvider } from '@microsoft-logic-apps/intl';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { store } from './store';
import { Provider as ReduxProvider } from 'react-redux';
import { ProviderWrappedContext } from './ProviderWrappedContext';

export interface DesignerProviderProps {
  theme?: Theme;
  locale?: string;
  children: React.ReactNode;
}

export const DesignerProviderInner = ({ theme = AzureThemeLight, locale = 'en', children }: DesignerProviderProps) => {
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
