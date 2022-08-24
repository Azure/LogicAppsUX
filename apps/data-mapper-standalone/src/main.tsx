import '../../../libs/data-mapper/src/lib/styles.less';
import { DataMapperStandaloneDesigner } from './app/DataMapperStandaloneDesigner';
import { store } from './state/Store';
import { initializeIcons } from '@fluentui/react';
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

initializeIcons();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StrictMode>
    <FluentProvider theme={teamsLightTheme}>
      <Provider store={store}>
        <DataMapperStandaloneDesigner />
      </Provider>
    </FluentProvider>
  </StrictMode>
);
