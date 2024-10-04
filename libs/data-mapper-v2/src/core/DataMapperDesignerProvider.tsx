import type { DataMapperDesignerContext } from './DataMapperDesignerContext';
import { reactPlugin } from './services/appInsights/AppInsights';
import { store } from './state/Store';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider } from '@fluentui/react-components';
import { PortalCompatProvider } from '@fluentui/react-portal-compat';
import { AppInsightsContext } from '@microsoft/applicationinsights-react-js';
import { IntlProvider, Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { getCustomizedTheme } from './ThemeConect';

export interface DataMapperDesignerProviderProps {
  theme?: ThemeType;
  locale?: string;
  options: DataMapperDesignerContext;
  children: React.ReactNode;
}

export const DataMapperDesignerProvider = ({ theme = ThemeType.Light, locale = 'en', children }: DataMapperDesignerProviderProps) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <AppInsightsContext.Provider value={reactPlugin}>
        <ReduxProvider store={store}>
          <ThemeProvider
            theme={theme === ThemeType.Light ? AzureThemeLight : AzureThemeDark}
            style={{
              flex: '1 1 1px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <FluentProvider
              theme={getCustomizedTheme(theme === ThemeType.Light)}
              style={{
                flex: '1 1 1px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
              {/* @ts-ignore */}
              <PortalCompatProvider>
                <QueryClientProvider client={new QueryClient()}>
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
                </QueryClientProvider>
              </PortalCompatProvider>
            </FluentProvider>
          </ThemeProvider>
        </ReduxProvider>
      </AppInsightsContext.Provider>
    </DndProvider>
  );
};
