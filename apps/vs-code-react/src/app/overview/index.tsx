import type { RunDisplayItem } from '../../run-service';
import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { App } from './app';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import { useContext } from 'react';
import { useSelector } from 'react-redux';

export const OverviewApp: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const vscode = useContext(VSCodeContext);

  return workflowState.initialized ? (
    <App
      apiVersion={workflowState.apiVersion}
      baseUrl={workflowState.baseUrl}
      onOpenRun={(run: RunDisplayItem) => {
        vscode.postMessage({
          command: ExtensionCommand.loadRun,
          item: run,
        });
      }}
      workflowProperties={workflowState.workflowProperties}
      accessToken={workflowState.accessToken}
      corsNotice={workflowState.corsNotice}
      hostVersion={workflowState.hostVersion}
    ></App>
  ) : null;
};
