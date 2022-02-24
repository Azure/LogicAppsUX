import { ThemeProvider, Theme } from '@fluentui/react';
import React from 'react';
import { IntlProvider } from '@microsoft-logic-apps/intl';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { store } from './store';
import { Provider } from 'react-redux';
import { ProviderWrappedContext } from './ProviderWrappedContext';

export interface DesignerProviderProps {
  theme?: Theme;
  locale?: string;
  children: React.ReactNode;
}

const DesignerProviderInner = ({ theme = AzureThemeLight, locale = 'en', children }: DesignerProviderProps) => {
  return (
    <ProviderWrappedContext.Provider value={true}>
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
    </ProviderWrappedContext.Provider>
  );
};

export const DesignerProvider = (props: DesignerProviderProps) => {
  return (
    <Provider store={store}>
      <DesignerProviderInner {...props}></DesignerProviderInner>
    </Provider>
  );
};
