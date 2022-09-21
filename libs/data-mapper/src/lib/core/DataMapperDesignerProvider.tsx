import type { DataMapperDesignerContext } from './DataMapperDesignerContext';
import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import { store } from './state/Store';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { IntlProvider } from '@microsoft-logic-apps/intl';
import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';

export interface DataMapperDesignerProviderProps {
  theme?: 'light' | 'dark';
  locale?: string;
  options: DataMapperDesignerContext;
  children: React.ReactNode;
}

// NOTE: Leaving ThemeProvider here as we still use Fluent V8 components, and their styles
// get thrown off if it's removed

export const DataMapperDesignerProvider = ({ theme = 'light', locale = 'en', options, children }: DataMapperDesignerProviderProps) => {
  return (
    <ReduxProvider store={store}>
      <DataMapperWrappedContext.Provider value={options}>
        <FluentProvider theme={theme === 'light' ? webLightTheme : webDarkTheme} style={{ height: '100%' }}>
          <ThemeProvider theme={AzureThemeLight} style={{ height: '100%' }}>
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
        </FluentProvider>
      </DataMapperWrappedContext.Provider>
    </ReduxProvider>
  );
};
