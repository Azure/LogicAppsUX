import { App } from './app/app';
import { store } from './state/Store';
import { WebViewCommunication } from './webviewCommunication';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StrictMode>
    <Provider store={store}>
      <WebViewCommunication>
        <App />
      </WebViewCommunication>
    </Provider>
  </StrictMode>
);
