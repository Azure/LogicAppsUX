import '../../../libs/data-mapper/src/lib/styles.less';
import { HelloWorldInApp } from './app/helloWorld';
import { initializeIcons } from '@fluentui/react';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';

initializeIcons();
ReactDOM.render(
  <StrictMode>
    <HelloWorldInApp />
  </StrictMode>,
  document.getElementById('root')
);
