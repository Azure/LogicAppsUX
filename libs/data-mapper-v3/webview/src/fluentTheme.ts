import { teamsHighContrastTheme, webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

export function getVsCodeFluentTheme(): Theme {
  if (document.body.classList.contains('vscode-high-contrast')) {
    return teamsHighContrastTheme;
  }

  return document.body.classList.contains('vscode-dark') ? webDarkTheme : webLightTheme;
}
