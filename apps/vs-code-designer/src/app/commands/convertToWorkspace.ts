import { extensionCommand } from '../../constants';
import { localize } from '../../localize';
import { addLocalFuncTelemetry } from '../utils/funcCoreTools/funcVersion';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import {
  ExtensionCommand,
  type IWebviewProjectContext,
  ProjectName,
  type IFunctionWizardContext,
} from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import {
  getWorkspaceFile,
  getWorkspaceFileInParentDirectory,
  getWorkspaceFolderWithoutPrompting,
  getWorkspaceRoot,
} from '../utils/workspace';
import { isLogicAppProject, isLogicAppProjectInRoot } from '../utils/verifyIsProject';
import { ext } from '../../extensionVariables';
import * as fse from 'fs-extra';
import * as path from 'path';
import { createWorkspaceWebviewCommandHandler } from './shared/workspaceWebviewCommandHandler';

export async function createWorkspaceFile(context: IActionContext, options: any): Promise<void> {
  addLocalFuncTelemetry(context);

  const myWebviewProjectContext: IWebviewProjectContext = options;

  const workspaceFolderPath = path.join(myWebviewProjectContext.workspaceProjectPath.fsPath, myWebviewProjectContext.workspaceName);

  await fse.ensureDir(workspaceFolderPath);
  const workspaceFilePath = path.join(workspaceFolderPath, `${myWebviewProjectContext.workspaceName}.code-workspace`);

  // Start with an empty folders array
  const workspaceFolders = [];
  const foldersToAdd = vscode.workspace.workspaceFolders;

  if (foldersToAdd && foldersToAdd.length === 1) {
    const folder = foldersToAdd[0];
    const folderPath = folder.uri.fsPath;
    if (await isLogicAppProject(folderPath)) {
      const destinationPath = path.join(workspaceFolderPath, folder.name);
      await fse.copy(folderPath, destinationPath);
      workspaceFolders.push({ name: folder.name, path: `./${folder.name}` });
    } else {
      const subpaths: string[] = await fse.readdir(folderPath);
      for (const subpath of subpaths) {
        const fullPath = path.join(folderPath, subpath);
        const destinationPath = path.join(workspaceFolderPath, subpath);
        await fse.copy(fullPath, destinationPath);
        workspaceFolders.push({ name: subpath, path: `./${subpath}` });
      }
    }
  }

  const workspaceData = {
    folders: workspaceFolders,
  };

  await fse.writeJSON(workspaceFilePath, workspaceData, { spaces: 2 });

  const uri = vscode.Uri.file(workspaceFilePath);

  await vscode.commands.executeCommand(extensionCommand.vscodeOpenFolder, uri, true /* forceNewWindow */);
}

async function createWorkspaceStructureWebview(_context: IActionContext): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    createWorkspaceWebviewCommandHandler({
      panelName: localize('createWorkspaceStructure', 'Create workspace structure'),
      panelGroupKey: ext.webViewKey.createWorkspaceStructure,
      projectName: ProjectName.createWorkspaceStructure,
      createCommand: ExtensionCommand.createWorkspaceStructure,
      createHandler: createWorkspaceFile,
      onResolve: resolve,
    });
  });
}

export async function convertToWorkspace(context: IActionContext): Promise<boolean> {
  const workspaceFolder = await getWorkspaceFolderWithoutPrompting();
  if (await isLogicAppProjectInRoot(workspaceFolder)) {
    addLocalFuncTelemetry(context);

    const wizardContext = context as Partial<IFunctionWizardContext> & IActionContext;
    context.telemetry.properties.isWorkspace = 'false';
    wizardContext.workspaceFilePath = (await getWorkspaceFile(wizardContext)) ?? (await getWorkspaceFileInParentDirectory(wizardContext));
    // save uri variable for open project folder command
    wizardContext.workspacePath = await getWorkspaceRoot(wizardContext);
    if (wizardContext.workspaceFilePath && !wizardContext.workspacePath) {
      const openWorkspaceMessage = localize(
        'openContainingWorkspace',
        `You must open your workspace to use the full functionality in the Azure Logic Apps (Standard) extension. You can find the workspace with your logic app project at the following location: ${wizardContext.workspaceFilePath}. Do you want to open this workspace now?`
      );
      const shouldOpenWorkspace = await vscode.window.showInformationMessage(
        openWorkspaceMessage,
        { modal: true },
        DialogResponses.yes,
        DialogResponses.no
      );
      if (shouldOpenWorkspace === DialogResponses.yes) {
        await vscode.commands.executeCommand(extensionCommand.vscodeOpenFolder, vscode.Uri.file(wizardContext.workspaceFilePath));
        context.telemetry.properties.openContainingWorkspace = 'true';
        return true;
      }
      context.telemetry.properties.openContainingWorkspace = 'false';
      return false;
    }

    if (!wizardContext.workspaceFilePath && !wizardContext.workspacePath) {
      const createWorkspaceMessage = localize(
        'createContainingWorkspace',
        'Your logic app projects must exist inside a workspace to use the full functionality in the Azure Logic Apps (Standard) extension. Visual Studio Code will copy your projects to a new workspace. Do you want to create the workspace now?'
      );
      const shouldCreateWorkspace = await vscode.window.showInformationMessage(
        createWorkspaceMessage,
        { modal: true },
        DialogResponses.yes,
        DialogResponses.no
      );
      if (shouldCreateWorkspace === DialogResponses.yes) {
        return await createWorkspaceStructureWebview(context);
      }
      context.telemetry.properties.createContainingWorkspace = 'false';
      return false;
    }

    context.telemetry.properties.isWorkspace = 'true';
    return true;
  }
}
