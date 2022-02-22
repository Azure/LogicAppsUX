import { useEffect, useMemo, useState } from 'react';
import { AzureThemeDark, AzureThemeLight } from '@fluentui/azure-themes';
import { ThemeProvider as FluentThemeProvider } from '@fluentui/react';

export const ThemeProvider: React.FC = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const observer = useMemo(
    () =>
      new MutationObserver((mutationRecord) => {
        for (const mutation of mutationRecord) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const { classList } = mutation.target as HTMLElement;
            const isInverted = classList.contains('vscode-dark');
            const newTheme = isInverted ? 'dark' : 'light';
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

  return <FluentThemeProvider theme={theme === 'dark' ? AzureThemeDark : AzureThemeLight}>{children}</FluentThemeProvider>;
};
