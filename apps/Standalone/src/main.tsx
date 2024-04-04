import { StrictMode } from 'react';
import './polyfills';
import { initializeIcons } from '@fluentui/react';
import { createRoot } from 'react-dom/client';

import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
initializeIcons();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
