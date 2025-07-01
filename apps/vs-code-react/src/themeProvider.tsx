import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { ThemeProvider as FluentUIv8ThemeProvider, createTheme } from '@fluentui/react';

const getTheme = (element: HTMLElement): 'light' | 'dark' => {
  const { classList } = element;
  const isInverted = classList.contains('vscode-dark');
  const theme = isInverted ? 'dark' : 'light';
  return theme;
};
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme(document.body));

  const observer = useMemo(
    () =>
      new MutationObserver((mutationRecord) => {
        for (const mutation of mutationRecord) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const newTheme = getTheme(mutation.target as HTMLElement);
            if (theme !== newTheme) {
              setTheme(newTheme);
            }
          }
        }
      }),
    [theme, setTheme]
  );

  useEffect(() => {
    observer.observe(document.body, {
      attributes: true,
    });
    return () => observer.disconnect();
  }, [observer]);

  // Create v8 themes for compatibility with legacy components
  const v8Theme = useMemo(() => {
    return createTheme({
      palette:
        theme === 'dark'
          ? {
              themePrimary: '#0078d4',
              themeLighterAlt: '#eff6fc',
              themeLighter: '#deecf9',
              themeLight: '#c7e0f4',
              themeTertiary: '#71afe5',
              themeSecondary: '#2b88d8',
              themeDarkAlt: '#106ebe',
              themeDark: '#005a9e',
              themeDarker: '#004578',
              neutralLighterAlt: '#2d2d30',
              neutralLighter: '#353538',
              neutralLight: '#414144',
              neutralQuaternaryAlt: '#4a4a4d',
              neutralQuaternary: '#515154',
              neutralTertiaryAlt: '#6f6f73',
              neutralTertiary: '#c8c8c8',
              neutralSecondary: '#d0d0d0',
              neutralSecondaryAlt: '#dadada',
              neutralPrimaryAlt: '#eaeaea',
              neutralPrimary: '#ffffff',
              neutralDark: '#f4f4f4',
              black: '#f8f8f8',
              white: '#252526',
            }
          : undefined,
    });
  }, [theme]);

  return (
    <FluentProvider theme={theme === 'dark' ? webDarkTheme : webLightTheme}>
      <FluentUIv8ThemeProvider theme={v8Theme}>{children}</FluentUIv8ThemeProvider>
    </FluentProvider>
  );
};
