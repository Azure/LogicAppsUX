import type { DataMapperDesignerContext } from './DataMapperDesignerContext';
import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import { store } from './state/Store';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme, themeToTokensObject } from '@fluentui/react-components';
import type { Theme } from '@fluentui/react-components';
import { IntlProvider } from '@microsoft-logic-apps/intl';
import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';

interface ExtendedTheme extends Theme {
  [key: string]: any;
}

const extendedWebLightTheme: ExtendedTheme = {
  ...webLightTheme,
  colorFnCategoryCollection: '#ae8c00',
  colorFnCategoryDateTime: '#4f6bed',
  colorFnCategoryLogical: '#038387',
  colorFnCategoryMath: '#004e8c',
  colorFnCategoryString: '#e43ba6',
  colorFnCategoryUtility: '#8764b8',
};

const extendedWebDarkTheme: ExtendedTheme = {
  ...webDarkTheme,
  colorFnCategoryCollection: '#c9a618',
  colorFnCategoryDateTime: '#93a4f4',
  colorFnCategoryLogical: '#4bb4b7',
  colorFnCategoryMath: '#286ea8',
  colorFnCategoryString: '#ef85cb',
  colorFnCategoryUtility: '#a083c9',
};

export const customTokens = themeToTokensObject(extendedWebLightTheme);

export interface DataMapperDesignerProviderProps {
  theme?: 'light' | 'dark';
  locale?: string;
  options: DataMapperDesignerContext;
  children: React.ReactNode;
}

// NOTE: Leaving ThemeProvider here as we still use Fluent V8 components
export const DataMapperDesignerProvider = ({ theme = 'light', locale = 'en', options, children }: DataMapperDesignerProviderProps) => {
  return (
    <ReduxProvider store={store}>
      <DataMapperWrappedContext.Provider value={options}>
        <FluentProvider
          theme={theme === 'light' ? extendedWebLightTheme : extendedWebDarkTheme}
          style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}
        >
          <ThemeProvider theme={AzureThemeLight} style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}>
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
