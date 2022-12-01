import { ProviderWrappedContext } from './ProviderWrappedContext';
import { ReactQueryProvider } from './ReactQueryProvider';
import type { DesignerOptionsState, ServiceOptions } from './state/designerOptions/designerOptionsInterfaces';
import { initDesignerOptions } from './state/designerOptions/designerOptionsSlice';
import { store } from './store';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { IntlProvider } from '@microsoft/intl-logic-apps';
import React, { useEffect } from 'react';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';

export interface DesignerProviderProps {
  locale?: string;
  options: Omit<DesignerOptionsState, 'servicesInitialized'> & { services: ServiceOptions };
  children: React.ReactNode;
}

const OptionsStateSet = ({ options, children }: any) => {
  const dispatch = useDispatch();
  useEffect(() => {
    if (!options) return; // TODO: This dispatch keeps getting ran out of order in storybook, overwriting the options with null values each time.  This is just a quick temp safeguard.
    dispatch(
      initDesignerOptions({ readOnly: options.readOnly, isMonitoringView: options.isMonitoringView, isDarkMode: options.isDarkMode })
    );
  }, [dispatch, options]);
  return <>{children}</>;
};

export const DesignerProvider = ({ locale = 'en', options, children }: DesignerProviderProps) => {
  const { isDarkMode } = options;
  const azTheme = isDarkMode ? AzureThemeDark : AzureThemeLight;
  const webTheme = !isDarkMode ? webLightTheme : webDarkTheme;
  useEffect(() => {
    document.body.classList.add(!isDarkMode ? 'light' : 'dark');
    document.body.classList.remove(!isDarkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-color-scheme', !isDarkMode ? 'light' : 'dark');
  }, [isDarkMode]);

  return (
    <ReduxProvider store={store}>
      <OptionsStateSet options={options}>
        <ProviderWrappedContext.Provider value={options.services}>
          <ThemeProvider theme={azTheme}>
            <FluentProvider theme={webTheme}>
              <div style={{ height: '100vh', overflow: 'hidden' }}>
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
              </div>
            </FluentProvider>
          </ThemeProvider>
        </ProviderWrappedContext.Provider>
      </OptionsStateSet>
    </ReduxProvider>
  );
};
