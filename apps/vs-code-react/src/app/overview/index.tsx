import type { RunDisplayItem } from '../../run-service';
import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { App } from './app';
import { ExtensionCommand } from '@microsoft-logic-apps/utils';
import { useContext } from 'react';
import { useSelector } from 'react-redux';

export const OverviewApp: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const vscode = useContext(VSCodeContext);

  return vscodeState.initialized ? (
    <App
      apiVersion={vscodeState.apiVersion}
      baseUrl={vscodeState.baseUrl}
      onOpenRun={(run: RunDisplayItem) => {
        vscode.postMessage({
          command: ExtensionCommand.loadRun,
          item: run,
        });
      }}
      workflowProperties={vscodeState.workflowProperties}
      accessToken={vscodeState.accessToken}
      corsNotice={vscodeState.corsNotice}
    ></App>
  ) : null;
};
