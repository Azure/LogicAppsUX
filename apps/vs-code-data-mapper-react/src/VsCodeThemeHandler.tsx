import { FluentProvider, webLightTheme, webDarkTheme, teamsHighContrastTheme } from '@fluentui/react-components';
import { useState } from 'react';

enum VsCodeThemeType {
  VsCodeLight = 'vscode-light',
  VsCodeDark = 'vscode-dark',
  VsCodeHighContrast = 'vscode-high-contrast',
}

// NOTE (AUG 2022): VS Code doesn't provide straightforward property for current theme, so we have to fetch it
// from document.body, either through className, or dataset['vscodeThemeKind'] as I've chosen

export const VsCodeThemeHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const vscodeTheme = () => (document.body.dataset.vscodeThemeKind as VsCodeThemeType) ?? VsCodeThemeType.VsCodeLight;

  const [vsCodeTheme, setVsCodeTheme] = useState<VsCodeThemeType>(vscodeTheme());

  // Monitor document.body for VS Code theme changes
  new MutationObserver(() => {
    setVsCodeTheme(vscodeTheme());
  }).observe(document.body, { attributes: true });

  const getCurrentTheme = () => {
    switch (vsCodeTheme) {
      case VsCodeThemeType.VsCodeLight:
        return webLightTheme;
      case VsCodeThemeType.VsCodeDark:
        return webDarkTheme;
      case VsCodeThemeType.VsCodeHighContrast:
        return teamsHighContrastTheme;
    }
  };

  return <FluentProvider theme={getCurrentTheme()}>{children}</FluentProvider>;
};
