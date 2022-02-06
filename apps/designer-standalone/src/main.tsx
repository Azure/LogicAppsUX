import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { initializeIcons } from '@fluentui/react';
import '../../../libs/designer/src/lib/ui/styles.less';
import { Provider } from 'react-redux';
import { store } from './state/store';
import { DesignerWrapper } from './app/Designer/designer';
initializeIcons();
ReactDOM.render(
  <StrictMode>
    <Provider store={store}>
      <DesignerWrapper />
    </Provider>
  </StrictMode>,
  document.getElementById('root')
);
