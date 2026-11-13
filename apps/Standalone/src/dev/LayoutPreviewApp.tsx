import './layoutPreviewBootstrap';
import { Provider } from 'react-redux';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer-v2';
import { LocalDesigner } from '../designer/app/LocalDesigner/localDesignerV2';
import { store } from '../designer/state/store';

export const App = () => (
  <Provider store={store}>
    <ReactQueryProvider persistEnabled={false}>
      <div style={{ height: '100vh' }}>
        <LocalDesigner />
      </div>
    </ReactQueryProvider>
  </Provider>
);
