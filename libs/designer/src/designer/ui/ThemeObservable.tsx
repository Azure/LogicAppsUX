import { Theme } from '@microsoft/logic-apps-designer';
import { useEffect } from 'react';

export const getTheme = (element: HTMLElement): Theme => {
  const { classList } = element;
  const isInverted = classList.contains('vscode-dark');
  const theme = isInverted ? Theme.Dark : Theme.Light;
  return theme;
};

export const useThemeObserver = (ref: any, theme: string, callback: any, options: any) => {
  useEffect(() => {
    const observer = new MutationObserver((mutationRecord: any) => {
      for (const mutation of mutationRecord) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const newTheme = getTheme(mutation.target as HTMLElement);
          if (theme !== newTheme) {
            callback(newTheme);
          }
        }
      }
    });
    observer.observe(ref, options);
    return () => observer.disconnect();
  }, [callback, options, ref, theme]);
};
