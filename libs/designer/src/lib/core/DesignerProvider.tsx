import { ThemeProvider, Theme } from '@fluentui/react';
import React, { useEffect } from 'react';
import { IntlProvider } from '@microsoft-logic-apps/intl';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { RootState, store } from './store';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ProviderWrappedContext } from './ProviderWrappedContext';
import { loadLocaleMessages } from './state/localizationSlice';

export interface DesignerProviderProps {
  theme?: Theme;
  locale?: string;
  children: React.ReactNode;
}

const DesignerProviderInner = ({ theme = AzureThemeLight, locale = 'en', children }: DesignerProviderProps) => {
  const i18n = useSelector((state: RootState) => state.localization);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadLocaleMessages(locale));
  }, [dispatch, locale]);
  return (
    <ProviderWrappedContext.Provider value={true}>
      <ThemeProvider theme={theme} className="msla-theme-provider">
        <Provider store={store}>
          <IntlProvider
            locale={i18n.locale}
            defaultLocale={i18n.defaultLocale}
            messages={i18n.messages}
            onError={(err) => {
              if (err.code === 'MISSING_TRANSLATION') {
                return;
              }
              throw err;
            }}
          >
            {children}
          </IntlProvider>
        </Provider>
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
