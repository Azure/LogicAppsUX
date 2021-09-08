import React, { useState } from 'react';
import { Checkbox } from '@designer/ui/checkbox';
import { ThemeProvider } from '@fluentui/react';
import { AzureThemeLight } from '../azure-themes';
const theme = AzureThemeLight;
function App() {
  return (
    <ThemeProvider theme={theme}>
      <Checkbox text="Hello" initChecked descriptionText="This is a description"></Checkbox>
    </ThemeProvider>
  );
}

export default App;
