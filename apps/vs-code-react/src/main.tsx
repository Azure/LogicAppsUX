import '../../../libs/designer/src/lib/ui/styles.less';
import { Router } from './router/index';
import { store } from './state/store';
import { ThemeProvider } from './themeProvider';
import { WebViewCommunication } from './webviewCommunication';
import { initializeIcons } from '@fluentui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

initializeIcons();
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StrictMode>
    <ThemeProvider>
      <Provider store={store}>
        <WebViewCommunication>
          <Router />
        </WebViewCommunication>
      </Provider>
    </ThemeProvider>
  </StrictMode>
);
