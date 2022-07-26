import '../../../libs/data-mapper/src/lib/styles.less';
import { DataMapperStandaloneDesigner } from './app/DataMapperStandaloneDesigner';
import { store } from './state/Store';
import { initializeIcons } from '@fluentui/react';
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

initializeIcons();

ReactDOM.render(
  <StrictMode>
    <FluentProvider theme={teamsLightTheme}>
      <Provider store={store}>
        <DataMapperStandaloneDesigner />
      </Provider>
    </FluentProvider>
  </StrictMode>,
  document.getElementById('root')
);
