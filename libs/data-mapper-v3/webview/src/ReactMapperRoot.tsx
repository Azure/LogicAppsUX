import React from 'react';
import type { MapEditorVsCodeApi } from '../../src/protocol/mapEditorProtocol';
import { MapperApp, MapperAppHandle } from './components/MapperApp';

interface ReactMapperRootProps {
    vscode: MapEditorVsCodeApi;
    onAppReady(app: MapperAppHandle | null): void;
}

export function ReactMapperRoot({ vscode, onAppReady }: ReactMapperRootProps): React.ReactElement {
    return (
        <div data-ui-framework="react" style={{ display: 'contents' }}>
            <MapperApp vscode={vscode} onReady={onAppReady} />
        </div>
    );
}
