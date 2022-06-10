import { AzureThemeDark, AzureThemeLight } from '@fluentui/azure-themes';
import { ThemeProvider as FluentThemeProvider } from '@fluentui/react';
import { useEffect, useMemo, useState } from 'react';

const getTheme = (element: HTMLElement): 'light' | 'dark' => {
  const { classList } = element;
  const isInverted = classList.contains('vscode-dark');
  const theme = isInverted ? 'dark' : 'light';
  return theme;
};
export const ThemeProvider: React.FC = ({ children }) => {
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

  return <FluentThemeProvider theme={theme === 'dark' ? AzureThemeDark : AzureThemeLight}>{children}</FluentThemeProvider>;
};
