import '../../../libs/designer/src/lib/ui/styles.less';
import { DesignerWrapper } from './app/Designer/designer';
import { store } from './state/store';
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
      <DesignerWrapper />
    </Provider>
  </StrictMode>
);
