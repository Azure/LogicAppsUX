import {
  FluentProvider,
  type FluentProviderProps,
  makeStyles,
  teamsHighContrastTheme,
  tokens,
  webDarkTheme,
  webLightTheme,
  type Theme,
} from '@fluentui/react-components';
import React from 'react';

export const useTypographyStyles = makeStyles({
  base: { fontSize: tokens.fontSizeBase200 },
});

export function getVsCodeFluentTheme(): Theme {
  if (document.body.classList.contains('vscode-high-contrast')) {
    return teamsHighContrastTheme;
  }

  return document.body.classList.contains('vscode-dark') ? webDarkTheme : webLightTheme;
}

const themeListeners = new Set<() => void>();
let themeObserver: MutationObserver | undefined;

function subscribeToThemeChanges(listener: () => void): () => void {
  themeListeners.add(listener);
  if (!themeObserver) {
    themeObserver = new MutationObserver(() => {
      for (const notify of themeListeners) {
        notify();
      }
    });
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-vscode-theme-id', 'data-vscode-theme-kind'],
    });
  }
  return () => {
    themeListeners.delete(listener);
    if (!themeListeners.size) {
      themeObserver?.disconnect();
      themeObserver = undefined;
    }
  };
}

function getThemeSnapshot(): string {
  return `${document.body.className}:${document.body.dataset.vscodeThemeId ?? ''}:${document.body.dataset.vscodeThemeKind ?? ''}`;
}

export const VsCodeFluentProvider = React.forwardRef<HTMLDivElement, Omit<FluentProviderProps, 'theme'>>((props, ref) => {
  React.useSyncExternalStore(subscribeToThemeChanges, getThemeSnapshot);
  const theme = getVsCodeFluentTheme();
  return React.createElement(FluentProvider, {
    ...props,
    ref,
    theme: {
      ...theme,
      colorNeutralBackground1: 'var(--vscode-editor-background)',
      colorNeutralBackground2: 'var(--vscode-sideBar-background, var(--vscode-editor-background))',
      colorNeutralForeground1: 'var(--vscode-foreground)',
      colorNeutralForeground2: 'var(--vscode-descriptionForeground, var(--vscode-foreground))',
      colorNeutralStroke1: 'var(--vscode-widget-border, var(--vscode-panel-border, transparent))',
      colorNeutralStroke2: 'var(--vscode-panel-border, transparent)',
      colorBrandBackground: 'var(--vscode-button-background)',
      colorBrandBackgroundHover: 'var(--vscode-button-hoverBackground, var(--vscode-button-background))',
      colorNeutralForegroundOnBrand: 'var(--vscode-button-foreground)',
      colorStrokeFocus2: 'var(--vscode-focusBorder)',
    },
  });
});

VsCodeFluentProvider.displayName = 'VsCodeFluentProvider';
