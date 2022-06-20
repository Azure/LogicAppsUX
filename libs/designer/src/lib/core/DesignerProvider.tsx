import { ProviderWrappedContext } from './ProviderWrappedContext';
import { ReactQueryProvider } from './ReactQueryProvider';
import type { DesignerOptionsState, ServiceOptions } from './state/designerOptions/designerOptionsInterfaces';
import { initDesignerOptions } from './state/designerOptions/designerOptionsSlice';
import { store } from './store';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import type { Theme } from '@fluentui/react';
import { ThemeProvider } from '@fluentui/react';
import { IntlProvider } from '@microsoft-logic-apps/intl';
import React, { useEffect } from 'react';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';

export interface DesignerProviderProps {
  theme?: Theme;
  locale?: string;
  options: Omit<DesignerOptionsState, 'servicesInitialized'> & { services: ServiceOptions };
  children: React.ReactNode;
}

const OptionsStateSet = ({
  options,
  children,
}: {
  options: Omit<DesignerOptionsState, 'servicesInitialized'>;
  children: React.ReactNode;
}) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(initDesignerOptions({ readOnly: options.readOnly, isMonitoringView: options.isMonitoringView }));
  }, [dispatch, options.readOnly, options.isMonitoringView]);
  return <>{children}</>;
};

export const DesignerProvider = ({ theme = AzureThemeLight, locale = 'en', options, children }: DesignerProviderProps) => {
  const { services, ...restOfOptions } = options;
  return (
    <ReduxProvider store={store}>
      <OptionsStateSet options={restOfOptions}>
        <ProviderWrappedContext.Provider value={services}>
          <ThemeProvider theme={theme} className="msla-theme-provider">
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
          </ThemeProvider>
        </ProviderWrappedContext.Provider>
      </OptionsStateSet>
    </ReduxProvider>
  );
};
