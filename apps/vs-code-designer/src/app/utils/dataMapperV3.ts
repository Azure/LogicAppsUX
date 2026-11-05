import {
  addDataMap,
  createWorkspaceMapperProject,
  findMapperProjects,
  importExistingMap,
  registerEmbeddedMapper,
} from 'btm-data-mapper/embedded';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';

export const dataMapperV3ViewType = 'azureLogicAppsStandard.dataMapperV3';
export const dataMapperV2ViewType = 'azureLogicAppsStandard.dataMapperV2';
const pendingDataMapKey = 'azureLogicAppsStandard.pendingDataMap';

interface PendingDataMap {
  workspaceFile: string;
  mapUri: string;
}

export function createDataMapProject(rootUri: vscode.Uri, mapName: string): Promise<vscode.Uri> {
  return createWorkspaceMapperProject(rootUri, mapName);
}

export async function rememberDataMapToOpen(workspaceFile: vscode.Uri, mapUri: vscode.Uri): Promise<void> {
  await ext.context.globalState.update(pendingDataMapKey, {
    workspaceFile: workspaceFile.toString(),
    mapUri: mapUri.toString(),
  } satisfies PendingDataMap);
}

export async function forgetDataMapToOpen(workspaceFile: vscode.Uri, mapUri: vscode.Uri): Promise<void> {
  const pending = ext.context.globalState.get<PendingDataMap>(pendingDataMapKey);
  if (pending?.workspaceFile === workspaceFile.toString() && pending.mapUri === mapUri.toString()) {
    await ext.context.globalState.update(pendingDataMapKey, undefined);
  }
}

async function openPendingDataMap(context: vscode.ExtensionContext): Promise<void> {
  const pending = context.globalState.get<PendingDataMap>(pendingDataMapKey);
  const workspaceFile = vscode.workspace.workspaceFile;
  if (!pending || !workspaceFile || workspaceFile.toString() !== pending.workspaceFile) {
    return;
  }
  const mapUri = vscode.Uri.parse(pending.mapUri);
  const stat = await vscode.workspace.fs.stat(mapUri);
  if (stat.type & vscode.FileType.File) {
    await vscode.commands.executeCommand('vscode.openWith', mapUri, dataMapperV3ViewType);
    await forgetDataMapToOpen(workspaceFile, mapUri);
  }
}

export function registerDataMapperV3(context: vscode.ExtensionContext): void {
  let revision = 0;
  let disposed = false;
  const refreshProjectFolders = async (): Promise<void> => {
    const currentRevision = ++revision;
    const projects = await findMapperProjects();
    if (disposed || currentRevision !== revision) {
      return;
    }
    await vscode.commands.executeCommand('setContext', 'azureLogicAppsStandard.dataMap.projectFolders', [
      ...new Set(projects.map((project) => vscode.Uri.file(project.uri.fsPath).fsPath)),
    ]);
  };
  const refresh = (): void => {
    refreshProjectFolders().catch((error) => {
      vscode.window.showErrorMessage(localize('dataMapV3ContextError', 'Could not refresh Data Map project folders: {0}', String(error)));
    });
  };
  const options = { viewType: dataMapperV3ViewType, lmlViewType: dataMapperV2ViewType, requireExistingProject: true };
  const watcher = vscode.workspace.createFileSystemWatcher('**/{*.[bB][tT][mM],*.[lL][mM][lL],Schemas,__generated}');
  context.subscriptions.push(
    registerEmbeddedMapper(
      context,
      dataMapperV3ViewType,
      vscode.Uri.joinPath(context.extensionUri, 'assets', 'data-mapper-v3'),
      dataMapperV2ViewType
    ),
    vscode.commands.registerCommand('azureLogicAppsStandard.dataMap.openDataMap', async (uri?: vscode.Uri) => {
      const mapUri = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (!mapUri || mapUri.scheme !== 'file' || !/\.(btm|lml)$/i.test(mapUri.path)) {
        vscode.window.showWarningMessage(localize('dataMapSelectMap', 'Select a BTM or LML map to open in Data Mapper.'));
        return;
      }
      try {
        const stat = await vscode.workspace.fs.stat(mapUri);
        if (!(stat.type & vscode.FileType.File)) {
          return;
        }
        await vscode.commands.executeCommand(
          'vscode.openWith',
          mapUri,
          /\.lml$/i.test(mapUri.path) ? dataMapperV2ViewType : dataMapperV3ViewType
        );
      } catch (error) {
        vscode.window.showErrorMessage(localize('dataMapV3OpenFileError', 'Could not open the Data Map: {0}', String(error)));
      }
    }),
    vscode.commands.registerCommand('azureLogicAppsStandard.dataMap.addDataMap', async (uri?: vscode.Uri) => {
      try {
        await addDataMap(uri, refresh, options);
      } catch (error) {
        vscode.window.showErrorMessage(localize('dataMapV3AddError', 'Could not add the Data Map: {0}', String(error)));
      }
    }),
    vscode.commands.registerCommand('azureLogicAppsStandard.dataMap.importDataMap', async (uri?: vscode.Uri) => {
      try {
        await importExistingMap(uri, refresh, context, options);
      } catch (error) {
        vscode.window.showErrorMessage(localize('dataMapV3ImportError', 'Could not import the Data Map: {0}', String(error)));
      }
    }),
    watcher,
    watcher.onDidCreate(refresh),
    watcher.onDidChange(refresh),
    watcher.onDidDelete(refresh),
    vscode.workspace.onDidChangeWorkspaceFolders(refresh),
    {
      dispose: () => {
        disposed = true;
        revision++;
      },
    }
  );
  openPendingDataMap(context).catch((error) => {
    vscode.window.showErrorMessage(localize('dataMapV3OpenError', 'Could not open the new Data Map: {0}', String(error)));
  });
  refresh();
}
