import { resetWorkflowState } from '.';
import { ProviderWrappedContext } from './ProviderWrappedContext';
import type { DesignerOptionsState, ServiceOptions } from './state/designerOptions/designerOptionsInterfaces';
import { initDesignerOptions } from './state/designerOptions/designerOptionsSlice';
import { store } from './store';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import type { OnErrorFn as OnIntlErrorFn } from '@formatjs/intl';
import { IntlProvider } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';

export interface DesignerProviderProps {
  key?: string;
  id?: string;
  locale?: string;
  options: Omit<DesignerOptionsState, 'servicesInitialized'> & { services: ServiceOptions };
  children: React.ReactNode;
}

const OptionsStateSet = ({ options, children }: any) => {
  const dispatch = useDispatch();
  useEffect(() => {
    if (!options) {
      return;
    }
    dispatch(initDesignerOptions(options));
  }, [dispatch, options]);
  return <>{children}</>;
};

export const DesignerProvider = ({ id, locale = 'en', options, children }: DesignerProviderProps) => {
  const { isDarkMode } = options;
  const azTheme = isDarkMode ? AzureThemeDark : AzureThemeLight;
  const webTheme = isDarkMode ? webDarkTheme : webLightTheme;
  const themeName = useMemo(() => (isDarkMode ? 'dark' : 'light'), [isDarkMode]);
  const onError = useCallback<OnIntlErrorFn>((err) => {
    if (err.code === 'MISSING_TRANSLATION' || err.code === 'MISSING_DATA') {
      console.error(`IntlProvider error ${err.code} - ${err.message} - ${err.stack}`);
      return;
    }
    throw err;
  }, []);

  return (
    <ReduxProvider store={store}>
      <OptionsStateSet options={options}>
        <ProviderWrappedContext.Provider value={options.services}>
          <ThemeProvider theme={azTheme}>
            <FluentProvider theme={webTheme}>
              <div data-color-scheme={themeName} className={`msla-theme-${themeName}`} style={{ height: '100vh', overflow: 'hidden' }}>
                <IntlProvider
                  locale={locale}
                  defaultLocale={locale}
                  stringOverrides={options.hostOptions.stringOverrides}
                  onError={onError}
                >
                  <ReduxReset id={id} />
                  {children}
                </IntlProvider>
              </div>
            </FluentProvider>
          </ThemeProvider>
        </ProviderWrappedContext.Provider>
      </OptionsStateSet>
    </ReduxProvider>
  );
};

// Redux state persists even through component re-mounts (like with changing the key prop in a parent), so we need to reset the state when the key changes manually
const ReduxReset = ({ id }: { id?: string }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(resetWorkflowState());
  }, [id, dispatch]);
  return null;
};
