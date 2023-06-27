import { App } from './app/app';
import { store } from './state/Store';
import { WebViewCommunication } from './webviewCommunication';
import { initializeIcons } from '@fluentui/react';
import { getReactQueryClient } from '@microsoft/logic-apps-designer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';

initializeIcons();

const queryClient = getReactQueryClient();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <IntlProvider
          defaultLocale="en"
          locale="en-US"
          onError={(err) => {
            if (err.code === 'MISSING_TRANSLATION') {
              return;
            }
            throw err;
          }}
        >
          <WebViewCommunication>
            <App />
          </WebViewCommunication>
        </IntlProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);
