import { lazy, Suspense } from 'react';
import { Provider } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import { store } from './designer/state/store';

const Designer = lazy(() =>
  import('./designer/app/DesignerShell/designer.ephemeral').then((module) => ({ default: module.DesignerWrapper }))
);
const DesignerV2 = lazy(() =>
  import('./designer/app/DesignerShell/designerV2.ephemeral').then((module) => ({ default: module.DesignerWrapper }))
);

export const App = () => (
  <Provider store={store}>
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Designer />} />
        <Route path="/v2" element={<DesignerV2 />} />
        <Route path="*" element={<Designer />} />
      </Routes>
    </Suspense>
  </Provider>
);
