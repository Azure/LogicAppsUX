import React from 'react';
import { ThemeProvider } from '@fluentui/react';
import { AzureThemeLight } from '../azure-themes';
import { IntlProvider } from 'react-intl';
import { ReactFlowFromWorkflow } from './playground-entries/react-flow-from-workflow';
const theme = AzureThemeLight;
function App() {
  return (
    <ThemeProvider theme={theme}>
      <IntlProvider locale="en">
        <div style={{ width: '100vw', height: '100vh' }}>
          <ReactFlowFromWorkflow />
        </div>
      </IntlProvider>
    </ThemeProvider>
  );
}

export default App;
