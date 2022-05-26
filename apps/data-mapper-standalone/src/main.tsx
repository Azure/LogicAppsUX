import '../../../libs/data-mapper/src/lib/styles.less';
import { DataMapperStandaloneDesigner } from './app/DataMapperStandaloneDesigner';
import { ParserViewInApp } from './app/parserView';
import { store } from './state/Store';
import { initializeIcons } from '@fluentui/react';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

initializeIcons();

ReactDOM.render(
  <StrictMode>
    <Provider store={store}>
      {/* <DataMapperStandaloneDesigner /> */}
      <ParserViewInApp />
    </Provider>
  </StrictMode>,
  document.getElementById('root')
);
