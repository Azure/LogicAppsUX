// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import '../../../libs/data-mapper/src/lib/styles.less';
import { DataMapperStandaloneDesigner } from './app/DataMapperStandaloneDesigner';
import { store } from './state/Store';
import { initializeIcons } from '@fluentui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

initializeIcons();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StrictMode>
    <Provider store={store}>
      <DataMapperStandaloneDesigner />
    </Provider>
  </StrictMode>
);
