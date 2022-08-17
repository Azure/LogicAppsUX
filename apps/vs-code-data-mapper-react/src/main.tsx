import { WebViewMsgHandler } from './WebViewMsgHandler';
import { App } from './app/app';
import { store } from './state/Store';
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

ReactDOM.render(
  <StrictMode>
    <FluentProvider theme={teamsLightTheme}>
      <Provider store={store}>
        <WebViewMsgHandler>
          <App />
        </WebViewMsgHandler>
      </Provider>
    </FluentProvider>
  </StrictMode>,
  document.getElementById('root')
);
