import React from "react";
import { initializeIcons, ThemeProvider } from "@fluentui/react";
import {
  AzureThemeLight,
  AzureThemeDark,
  AzureThemeHighContrastLight,
  AzureThemeHighContrastDark,
} from '../azure-themes';
const theme = AzureThemeLight;


export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
initializeIcons()
export const decorators = [
  (Story) => (
    <ThemeProvider theme={theme}>
      <Story />
    </ThemeProvider>
  ),
];
