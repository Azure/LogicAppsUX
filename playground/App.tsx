import React, { useState } from "react";
import { Checkbox } from "@designer/ui/checkbox";
import { ThemeProvider } from "@fluentui/react";
import {
  AzureThemeLight,
} from "@fluentui/azure-themes";
const theme = AzureThemeLight;
function App() {
  return (
    <ThemeProvider theme={theme}>
      <Checkbox text="Hello" initChecked></Checkbox>
    </ThemeProvider>
  );
}

export default App;
