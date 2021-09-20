import React from 'react';
import { Checkbox } from '@designer/ui/checkbox';
import { ThemeProvider } from '@fluentui/react';
import { AzureThemeLight } from '../azure-themes';
import { IntlProvider } from 'react-intl';
const theme = AzureThemeLight;
function App() {
  return (
    <ThemeProvider theme={theme}>
      <IntlProvider locale="en">
        <Checkbox descriptionText="Hello World" text="Hello Tony!" />
      </IntlProvider>
    </ThemeProvider>
  );
}

export default App;
