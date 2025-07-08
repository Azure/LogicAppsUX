import type { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { IntlProvider } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { McpWrappedContext } from './McpWizardContext';
import { mcpStore } from '../state/mcp/store';
import type { ServiceOptions } from '../state/mcp/mcpOptions/mcpOptionsInterface';

export interface McpWizardProviderProps {
  theme?: ThemeType;
  locale?: string;
  useExternalRedux?: boolean;
  children: React.ReactNode;
  services: ServiceOptions;
}

export const McpWizardProvider = ({ locale = 'en', useExternalRedux = false, children, services }: McpWizardProviderProps) => {
  const content = (
    <McpWrappedContext.Provider value={services}>
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
    </McpWrappedContext.Provider>
  );

  return useExternalRedux ? content : <ReduxProvider store={mcpStore}>{content}</ReduxProvider>;
};
