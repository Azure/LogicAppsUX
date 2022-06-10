
import { App } from './app';
import type { RunDisplayItem } from '../../run-service';
import { useSelector } from 'react-redux';
import type { RootState } from '../../state/store';
import { useContext } from 'react';
import { VSCodeContext } from '../../webviewCommunication';

export const OverviewApp: React.FC = () => {
    const overviewState = useSelector((state: RootState) => state.overview);
    const vscode = useContext(VSCodeContext);

    return overviewState.initialized ? (
        <App
        apiVersion={overviewState.apiVersion}
        baseUrl={overviewState.baseUrl}
        onOpenRun={(run: RunDisplayItem) => {
            vscode.postMessage({
            command: 'LoadRun',
            item: run,
            });
        }}
        workflowProperties={overviewState.workflowProperties}
        accessToken={overviewState.accessToken}
        corsNotice={overviewState.corsNotice}
        ></App>
    ) : null;
};