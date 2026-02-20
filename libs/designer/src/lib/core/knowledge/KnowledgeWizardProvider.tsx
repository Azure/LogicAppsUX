import type { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { IntlProvider } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { mcpStore } from '../state/mcp/store';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { KnowledgeWrappedContext } from './KnowledgeWizardContext';

export interface KnowledgeWizardProviderProps {
  theme?: ThemeType;
  locale?: string;
  useExternalRedux?: boolean;
  children: React.ReactNode;
}

export const KnowledgeWizardProvider = ({ locale = 'en', useExternalRedux = false, children, theme }: KnowledgeWizardProviderProps) => {
  const webTheme = theme === 'light' ? webLightTheme : webDarkTheme;
  const content = (
    <KnowledgeWrappedContext.Provider value={{ readOnly: false }}>
      <FluentProvider theme={webTheme} style={{ height: 'inherit' }}>
        <div
          data-color-scheme={theme}
          className={`msla-theme-${theme}`}
          style={{ display: 'flex', flexDirection: 'column', height: 'inherit' }}
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
      </FluentProvider>
    </KnowledgeWrappedContext.Provider>
  );

  return useExternalRedux ? content : <ReduxProvider store={mcpStore}>{content}</ReduxProvider>;
};
