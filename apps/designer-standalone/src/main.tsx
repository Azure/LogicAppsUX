import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { initializeIcons } from '@fluentui/react';
import '../../../libs/designer/src/lib/ui/styles.less';
import App from './app/app';
initializeIcons();
ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById('root')
);
