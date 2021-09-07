import React from "react";
import { ThemeProvider } from "@fluentui/react";
import {
  AzureThemeLight,
  AzureThemeDark,
  AzureThemeHighContrastLight,
  AzureThemeHighContrastDark,
} from '@fluentui/azure-themes';
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

export const decorators = [
  (Story) => (
    <ThemeProvider theme={theme}>
      <Story />
    </ThemeProvider>
  ),
];
