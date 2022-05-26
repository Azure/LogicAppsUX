import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import type { Theme } from '@fluentui/react';
import { ThemeProvider } from '@fluentui/react';
import { IntlProvider } from '@microsoft-logic-apps/intl';
import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import type { DataMapperDesignerContext } from './DataMapperDesignerContext';
import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import { store } from './state/Store';

export interface DataMapperDesignerProviderProps {
  theme?: Theme;
  locale?: string;
  options: DataMapperDesignerContext;
  children: React.ReactNode;
}

export const DataMapperDesignerProvider = ({
  theme = AzureThemeLight,
  locale = 'en',
  options,
  children,
}: DataMapperDesignerProviderProps) => {
  return (
    <ReduxProvider store={store}>
      <DataMapperWrappedContext.Provider value={options}>
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
      </DataMapperWrappedContext.Provider>
    </ReduxProvider>
  );
};
