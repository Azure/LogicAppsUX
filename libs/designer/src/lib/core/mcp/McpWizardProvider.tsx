import { templateStore } from '../state/templates/store';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { ThemeProvider } from '@fluentui/react';
import type { Theme } from '@fluentui/react-components';
import { FluentProvider, themeToTokensObject, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { IntlProvider, Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { McpWrappedContext } from './McpWizardContext';

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
  colorFnCategoryConversion: '#814e29',
};

const extendedWebDarkTheme: ExtendedTheme = {
  ...webDarkTheme,
  colorFnCategoryCollection: '#ae8c00',
  colorFnCategoryDateTime: '#4f6bed',
  colorFnCategoryLogical: '#038387',
  colorFnCategoryMath: '#004e8c',
  colorFnCategoryString: '#e43ba6',
  colorFnCategoryUtility: '#8764b8',
  colorFnCategoryConversion: '#814e29',
};

export const customTokens = themeToTokensObject(extendedWebLightTheme);

export interface McpWizardProviderProps {
  id?: string;
  theme?: ThemeType;
  locale?: string;
  useExternalRedux?: boolean;
  children: React.ReactNode;
}

export const McpWizardProvider = ({
  theme = ThemeType.Light,
  locale = 'en',
  useExternalRedux = false,
  children,
}: McpWizardProviderProps) => {
  const content = (
    <McpWrappedContext.Provider value={{}}>
      <ThemeProvider
        theme={theme === ThemeType.Light ? AzureThemeLight : AzureThemeDark}
        style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}
      >
        <FluentProvider
          theme={theme === ThemeType.Light ? extendedWebLightTheme : extendedWebDarkTheme}
          style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}
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
        </FluentProvider>
      </ThemeProvider>
    </McpWrappedContext.Provider>
  );

  return useExternalRedux ? content : <ReduxProvider store={templateStore}>{content}</ReduxProvider>;
};
