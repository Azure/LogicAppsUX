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
import React, { useEffect, useMemo } from 'react';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';

export interface DesignerProviderProps {
  locale?: string;
  options: Omit<DesignerOptionsState, 'servicesInitialized'> & { services: ServiceOptions };
  children: React.ReactNode;
}

const OptionsStateSet = ({ options, children }: any) => {
  const dispatch = useDispatch();
  useEffect(() => {
    if (!options) return;
    dispatch(
      initDesignerOptions({
        readOnly: options.readOnly,
        isMonitoringView: options.isMonitoringView,
        isDarkMode: options.isDarkMode,
        isConsumption: options.isConsumption,
        isXrmConnectionReferenceMode: options.isXrmConnectionReferenceMode,
      })
    );
  }, [dispatch, options]);
  return <>{children}</>;
};

export const DesignerProvider = ({ locale = 'en', options, children }: DesignerProviderProps) => {
  const { isDarkMode } = options;
  const azTheme = !isDarkMode ? AzureThemeLight : AzureThemeDark;
  const webTheme = !isDarkMode ? webLightTheme : webDarkTheme;
  const themeName = useMemo(() => (!isDarkMode ? 'light' : 'dark'), [isDarkMode]);

  return (
    <ReduxProvider store={store}>
      <OptionsStateSet options={options}>
        <ProviderWrappedContext.Provider value={options.services}>
          <ThemeProvider theme={azTheme}>
            <FluentProvider theme={webTheme}>
              <div data-color-scheme={themeName} className={`msla-theme-${themeName}`} style={{ height: '100vh', overflow: 'hidden' }}>
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
