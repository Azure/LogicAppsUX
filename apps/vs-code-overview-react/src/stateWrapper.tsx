import { useContext } from 'react';
import { useSelector } from 'react-redux';
import { App } from './app/app';
import { RunDisplayItem } from './run-service';
import { RootState } from './state/store';
import { VSCodeContext } from './webviewCommunication';

export const StateWrapper: React.FC = () => {
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
