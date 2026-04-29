import { Theme as ThemeType, IntlProvider } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { knowledgeStore } from '../state/knowledge/store';
import { ThemeProvider } from '@fluentui/react';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { KnowledgeWrappedContext } from './KnowledgeWizardContext';

export interface KnowledgeWizardProviderProps {
  theme?: ThemeType;
  locale?: string;
  useExternalRedux?: boolean;
  children: React.ReactNode;
}

export const KnowledgeWizardProvider = ({ locale = 'en', useExternalRedux = false, children, theme }: KnowledgeWizardProviderProps) => {
  const webTheme = theme === ThemeType.Light ? webLightTheme : webDarkTheme;
  const content = (
    <KnowledgeWrappedContext.Provider value={{ readOnly: false }}>
      <ThemeProvider theme={theme === ThemeType.Light ? AzureThemeLight : AzureThemeDark} style={{ height: 'inherit' }}>
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
      </ThemeProvider>
    </KnowledgeWrappedContext.Provider>
  );

  return useExternalRedux ? content : <ReduxProvider store={knowledgeStore}>{content}</ReduxProvider>;
};
