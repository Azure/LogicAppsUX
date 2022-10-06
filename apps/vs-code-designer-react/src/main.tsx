import { App } from './app/app';
import { WebViewCommunication } from './webviewCommunication';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StrictMode>
    <WebViewCommunication>
      <App />
    </WebViewCommunication>
  </StrictMode>
);
