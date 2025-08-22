import type { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { IntlProvider } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { cloneStandardStore } from '../state/clonetostandard/store';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { ExportWizardContextContext } from './clonewizardcontext';

export interface ExportWizardProviderProps {
  theme?: ThemeType;
  locale?: string;
  useExternalRedux?: boolean;
  children: React.ReactNode;
}

export const CloneWizardProvider = ({ locale = 'en', useExternalRedux = false, children, theme }: ExportWizardProviderProps) => {
  const webTheme = theme === 'light' ? webLightTheme : webDarkTheme;
  const content = (
    <ExportWizardContextContext.Provider value={{ readOnly: false }}>
      <FluentProvider theme={webTheme} style={{ height: 'inherit' }}>
        <div
          data-color-scheme={theme}
          className={`msla-theme-${theme}`}
          style={{ display: 'flex', flexDirection: 'column', height: 'inherit', overflow: 'hidden' }}
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
    </ExportWizardContextContext.Provider>
  );

  return useExternalRedux ? content : <ReduxProvider store={cloneStandardStore}>{content}</ReduxProvider>;
};
