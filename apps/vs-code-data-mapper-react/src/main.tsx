import { VsCodeThemeHandler } from './VsCodeThemeHandler';
import { WebViewMsgHandler } from './WebViewMsgHandler';
import { App } from './app/app';
import { store } from './state/Store';
import { initializeIcons } from '@fluentui/react';
import { defaultSchemaSelectionServiceOptions, InitSchemaSelectionService } from '@microsoft/logic-apps-data-mapper';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

initializeIcons();

InitSchemaSelectionService(defaultSchemaSelectionServiceOptions);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StrictMode>
    <VsCodeThemeHandler>
      <Provider store={store}>
        <WebViewMsgHandler>
          <App />
        </WebViewMsgHandler>
      </Provider>
    </VsCodeThemeHandler>
  </StrictMode>
);
