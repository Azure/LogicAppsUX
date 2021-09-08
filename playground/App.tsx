import React, { useState } from 'react';
import { Checkbox } from '@designer/ui/checkbox';
import { ThemeProvider } from '@fluentui/react';
import { AzureThemeLight } from '../azure-themes';
import { AnnouncedMatches } from '@designer/ui/announcedmatches';
import { IntlProvider } from 'react-intl';
const theme = AzureThemeLight;
function App() {
  return (
    <ThemeProvider theme={theme}>
      <IntlProvider locale="en">
        <AnnouncedMatches isLoading={true} count={0} visible={true} />
      </IntlProvider>
    </ThemeProvider>
  );
}

export default App;
