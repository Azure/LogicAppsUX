// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import '../../../libs/designer/src/lib/ui/styles.less';
import { Router } from './router/index';
import { store } from './state/store';
import { ThemeProvider } from './themeProvider';
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
    <ThemeProvider>
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
              <Router />
            </WebViewCommunication>
          </IntlProvider>
        </QueryClientProvider>
      </Provider>
    </ThemeProvider>
  </StrictMode>
);
