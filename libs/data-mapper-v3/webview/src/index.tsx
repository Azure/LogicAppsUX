/**
 * BizTalk Data Mapper - Webview Entry Point
 * Initializes the visual mapper UI inside VS Code webview
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReactMapperRoot } from './ReactMapperRoot';
import type { MapperAppHandle } from './components/MapperApp';
import {
    isHostToWebviewMessage,
    MapEditorVsCodeApi
} from '../../src/protocol/mapEditorProtocol';

declare function acquireVsCodeApi(): MapEditorVsCodeApi;

let app: MapperAppHandle | null = null;

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

    createRoot(container).render(
        <ReactMapperRoot vscode={vscode} onAppReady={handleAppReady} />
    );

} catch (e: any) {
    const container = document.getElementById('app');
    if (container) {
        container.innerHTML = `
            <div style="padding: 20px; color: #f48771;">
                <h3>Logic App Data Mapper - Error</h3>
                <pre style="margin-top: 10px; white-space: pre-wrap;">${e.message}\n${e.stack || ''}</pre>
            </div>
        `;
    }
}
