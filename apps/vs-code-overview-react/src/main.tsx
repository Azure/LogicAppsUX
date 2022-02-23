import { initializeIcons } from '@fluentui/react';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { store } from './state/store';
import { StateWrapper } from './stateWrapper';
import { WebViewCommunication } from './webviewCommunication';
import { ThemeProvider } from './themeProvider';

import '../../../libs/designer/src/lib/ui/styles.less';

initializeIcons();
ReactDOM.render(
  <StrictMode>
    <ThemeProvider>
      <Provider store={store}>
        <WebViewCommunication>
          <StateWrapper />
        </WebViewCommunication>
      </Provider>
    </ThemeProvider>
  </StrictMode>,
  document.getElementById('root')
);
