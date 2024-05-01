import { templateStore } from '../state/templates/store';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { ThemeProvider } from '@fluentui/react';
import type { Theme } from '@fluentui/react-components';
import { FluentProvider, themeToTokensObject, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { IntlProvider, Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { ReactQueryProvider } from '../ReactQueryProvider';
import { TemplatesWrappedContext } from './TemplatesDesignerContext';

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
  colorFnCategoryCollection: '#c9a618',
  colorFnCategoryDateTime: '#93a4f4',
  colorFnCategoryLogical: '#4bb4b7',
  colorFnCategoryMath: '#286ea8',
  colorFnCategoryString: '#ef85cb',
  colorFnCategoryUtility: '#a083c9',
  colorFnCategoryConversion: '#9c663f',
};

export const customTokens = themeToTokensObject(extendedWebLightTheme);

export interface TemplatesDesignerProviderProps {
  theme?: ThemeType;
  locale?: string;
  children: React.ReactNode;
}

export const TemplatesDesignerProvider = ({ theme = ThemeType.Light, locale = 'en', children }: TemplatesDesignerProviderProps) => {
  return (
    <ReduxProvider store={templateStore}>
      <TemplatesWrappedContext.Provider value={{}}>
        <ThemeProvider
          theme={theme === ThemeType.Light ? AzureThemeLight : AzureThemeDark}
          style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}
        >
          <FluentProvider
            theme={theme === ThemeType.Light ? extendedWebLightTheme : extendedWebDarkTheme}
            style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}
          >
            <ReactQueryProvider>
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
            </ReactQueryProvider>
          </FluentProvider>
        </ThemeProvider>
      </TemplatesWrappedContext.Provider>
    </ReduxProvider>
  );
};
