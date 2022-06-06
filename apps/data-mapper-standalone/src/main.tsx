import '../../../libs/data-mapper/src/lib/styles.less';
import { DataMapperStandaloneDesigner } from './app/DataMapperStandaloneDesigner';
import { ParserViewInApp } from './components/ParserView';
import { store } from './state/Store';
import { initializeIcons } from '@fluentui/react';
import { ParserInputFormat } from '@microsoft/logic-apps-data-mapper';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

initializeIcons();

ReactDOM.render(
  <StrictMode>
    <Provider store={store}>
      <ParserViewInApp />
      {/* <DataMapperStandaloneDesigner /> */}
    </Provider>
  </StrictMode>,
  document.getElementById('root')
);
