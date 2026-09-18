import { initializeProjectOverview, updateProjectOverview, updateProjectOverviewVisibility } from '../../state/ProjectOverviewSlice';
import { initialize } from '../../state/projectSlice';
import type { AppDispatch } from '../../state/store';
import { ExtensionCommand, ProjectName, type ProjectOverviewMessageToWebview } from '@microsoft/vscode-extension-logic-apps';

export function routeProjectOverviewMessage(dispatch: AppDispatch, message: ProjectOverviewMessageToWebview): boolean {
  switch (message.command) {
    case ExtensionCommand.initializeProjectOverview: {
      dispatch(initializeProjectOverview(message.data));
      dispatch(initialize({ project: ProjectName.overview }));
      return true;
    }
    case ExtensionCommand.updateProjectOverview: {
      dispatch(updateProjectOverview(message.data));
      return true;
    }
    case ExtensionCommand.projectOverviewVisibilityChanged: {
      dispatch(updateProjectOverviewVisibility(message.data));
      return true;
    }
    default:
      return false;
  }
}
