import { makeStyles, teamsHighContrastTheme, tokens, webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

export const useTypographyStyles = makeStyles({
  base: { fontSize: tokens.fontSizeBase200 },
});

export function getVsCodeFluentTheme(): Theme {
  if (document.body.classList.contains('vscode-high-contrast')) {
    return teamsHighContrastTheme;
  }

  return document.body.classList.contains('vscode-dark') ? webDarkTheme : webLightTheme;
}
