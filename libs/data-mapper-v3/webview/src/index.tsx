// biome-ignore lint/correctness/noUnusedImports: The classic JSX transform requires React at runtime.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReactMapperRoot } from './ReactMapperRoot';
import type { MapperAppHandle } from './components/MapperApp';
import { isHostToWebviewMessage, type MapEditorVsCodeApi } from '../../src/protocol/mapEditorProtocol';

declare function acquireVsCodeApi(): MapEditorVsCodeApi;

let app: MapperAppHandle | null = null;

function renderStartupError(container: HTMLElement, error: unknown): void {
  const message = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
  createRoot(container).render(
    <div style={{ padding: '20px', color: '#f48771' }}>
      <h3>Logic App Data Mapper - Error</h3>
      <pre style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}>{message}</pre>
    </div>
  );
}

try {
  const vscode = acquireVsCodeApi();
  const container = document.getElementById('app');

  if (!container) {
    throw new Error('Could not find #app container');
  }

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (app && isHostToWebviewMessage(message)) {
      app.handleMessage(message);
    }
  });

  const handleAppReady = (mapperApp: MapperAppHandle | null): void => {
    app = mapperApp;
    if (mapperApp) {
      vscode.postMessage({ type: 'ready' });
    }
  };

  createRoot(container).render(<ReactMapperRoot vscode={vscode} onAppReady={handleAppReady} />);
} catch (error: unknown) {
  const container = document.getElementById('app');
  if (container) {
    renderStartupError(container, error);
  }
}
