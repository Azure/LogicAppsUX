import { ThemeProvider } from '@fluentui/react';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { store } from './state/store';
import { StateWrapper } from './stateWrapper';
import { WebViewCommunication } from './webviewCommunication';
import { AzureThemeDark, AzureThemeLight } from '@fluentui/azure-themes';

function getTheme() {
  const { classList } = document.body;
  const isInverted = classList.contains('vscode-dark');
  const theme = isInverted ? 'dark' : 'light';
  return { classList, theme };
}

ReactDOM.render(
  <StrictMode>
    <ThemeProvider theme={getTheme().theme === 'dark' ? AzureThemeDark : AzureThemeLight}>
      <Provider store={store}>
        <WebViewCommunication>
          <StateWrapper />
        </WebViewCommunication>
      </Provider>
    </ThemeProvider>
  </StrictMode>,
  document.getElementById('root')
);
