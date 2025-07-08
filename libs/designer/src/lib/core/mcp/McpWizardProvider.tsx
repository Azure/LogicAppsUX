import type { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { IntlProvider } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { McpWrappedContext } from './McpWizardContext';
import { mcpStore } from '../state/mcp/store';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';

export interface McpWizardProviderProps {
  theme?: ThemeType;
  locale?: string;
  useExternalRedux?: boolean;
  children: React.ReactNode;
}

export const McpWizardProvider = ({ locale = 'en', useExternalRedux = false, children, theme }: McpWizardProviderProps) => {
  const webTheme = theme === 'light' ? webLightTheme : webDarkTheme;
  const content = (
    <McpWrappedContext.Provider value={{ readOnly: false }}>
      <FluentProvider theme={webTheme} style={{ height: 'inherit' }}>
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
      </FluentProvider>
    </McpWrappedContext.Provider>
  );

  return useExternalRedux ? content : <ReduxProvider store={mcpStore}>{content}</ReduxProvider>;
};
