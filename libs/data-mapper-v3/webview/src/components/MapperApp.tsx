import React, { useLayoutEffect, useRef } from 'react';
import type {
    HostToWebviewMessage,
    MapEditorVsCodeApi
} from '../../../src/protocol/mapEditorProtocol';
import { MapperAppController } from './MapperAppController';
import './MapperApp.css';

export interface MapperAppHandle {
    handleMessage(message: HostToWebviewMessage): void;
}

interface MapperAppProps {
    vscode: MapEditorVsCodeApi;
    onReady(app: MapperAppHandle | null): void;
}

function useMapperAppController(
    vscode: MapEditorVsCodeApi,
    onReady: (app: MapperAppHandle | null) => void
): React.RefObject<HTMLDivElement> {
    const hostRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!hostRef.current) {
            return;
        }

        const controller = new MapperAppController(hostRef.current, vscode);
        controller.mount();
        onReady({
            handleMessage(message): void {
                controller.handleMessage(message);
            }
        });

        return () => {
            onReady(null);
            controller.dispose();
        };
    }, [onReady, vscode]);

    return hostRef;
}

export function MapperApp({ vscode, onReady }: MapperAppProps): React.ReactElement {
    const hostRef = useMapperAppController(vscode, onReady);
    return <div ref={hostRef} className="mapper-container" data-component="mapper-app" />;
}
