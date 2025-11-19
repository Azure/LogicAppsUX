import React from 'react';
import { FluentProvider, Theme } from '@fluentui/react-components';
import {
  createCustomTheme,
  ThemeConfig,
  defaultLightTheme,
  defaultDarkTheme,
} from '../../theme/fluentTheme';

export interface ChatThemeProviderProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
  themeConfig?: ThemeConfig;
  customTheme?: Theme;
}

export const ChatThemeProvider: React.FC<ChatThemeProviderProps> = ({
  children,
  theme = 'light',
  themeConfig,
  customTheme,
}) => {
  const fluentTheme = React.useMemo(() => {
    if (customTheme) {
      return customTheme;
    }

    if (themeConfig) {
      const { lightTheme, darkTheme } = createCustomTheme(themeConfig);
      return theme === 'dark' ? darkTheme : lightTheme;
    }

    return theme === 'dark' ? defaultDarkTheme : defaultLightTheme;
  }, [theme, themeConfig, customTheme]);

  // Workaround for Fluent UI Tabster accessibility issues
  React.useEffect(() => {
    // Fix tabster dummy elements that have aria-hidden="true" with tabindex="0"
    const fixTabsterAccessibility = () => {
      const tabsterDummies = document.querySelectorAll(
        '[data-tabster-dummy][aria-hidden="true"][tabindex="0"]'
      );
      tabsterDummies.forEach((element) => {
        element.setAttribute('tabindex', '-1');
      });
    };

    // Run on mount and whenever DOM changes
    fixTabsterAccessibility();

    // Use MutationObserver to fix new elements added dynamically
    const observer = new MutationObserver(() => {
      fixTabsterAccessibility();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-tabster-dummy'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return <FluentProvider theme={fluentTheme}>{children}</FluentProvider>;
};
