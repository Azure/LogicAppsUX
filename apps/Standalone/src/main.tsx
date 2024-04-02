import React from 'react';
import { DesignerWrapper } from './app/DesignerShell/designer';
import './polyfills';
import { store } from './state/store';
import { initializeIcons } from '@fluentui/react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
// import './index.css';

initializeIcons();
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <DesignerWrapper />
    </Provider>
  </React.StrictMode>
);
