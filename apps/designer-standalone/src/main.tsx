import '../../../libs/designer/src/lib/ui/styles.less';
import { DesignerWrapper } from './app/Designer/designer';
import { store } from './state/store';
import { initializeIcons } from '@fluentui/react';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

initializeIcons();
ReactDOM.render(
  <StrictMode>
    <Provider store={store}>
      <DesignerWrapper />
    </Provider>
  </StrictMode>,
  document.getElementById('root')
);
