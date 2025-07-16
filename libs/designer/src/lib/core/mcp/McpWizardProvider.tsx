import { Theme as ThemeType, IntlProvider } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { McpWrappedContext } from './McpWizardContext';
import { mcpStore } from '../state/mcp/store';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { AzureThemeDark, AzureThemeLight } from '@fluentui/azure-themes/lib/azure';
import { ThemeProvider } from '@fluentui/react';

export interface McpWizardProviderProps {
  theme?: ThemeType;
  locale?: string;
  useExternalRedux?: boolean;
  children: React.ReactNode;
}

export const McpWizardProvider = ({ locale = 'en', useExternalRedux = false, children, theme }: McpWizardProviderProps) => {
  const webTheme = theme === 'light' ? webLightTheme : webDarkTheme;
  const isLightMode = theme === ThemeType.Light;
  const content = (
    <McpWrappedContext.Provider value={{ readOnly: false }}>
      <FluentProvider theme={webTheme} style={{ height: 'inherit' }}>
        <ThemeProvider theme={isLightMode ? AzureThemeLight : AzureThemeDark}>
          {/* Add this for v8 components */}
          <div
            data-color-scheme={theme}
            className={`msla-theme-${theme}`}
            style={{ display: 'flex', flexDirection: 'column', height: 'inherit', overflow: 'hidden' }}
          >
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
          </div>
        </ThemeProvider>
      </FluentProvider>
    </McpWrappedContext.Provider>
  );

  return useExternalRedux ? content : <ReduxProvider store={mcpStore}>{content}</ReduxProvider>;
};
