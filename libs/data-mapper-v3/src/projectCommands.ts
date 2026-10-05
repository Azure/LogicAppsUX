import * as vscode from 'vscode';
import {
  createEmptyMap,
  createMapperProject,
  findMapperProjects,
  getDuplicateSafeName,
  getWorkspaceRoot,
  isMapperProject,
  normalizeMapName,
  readDirectoryNames,
  validateMapName,
  validateWorkspaceName,
} from './workspaceStructure';

type CommandTarget = vscode.Uri | { resourceUri?: vscode.Uri } | undefined;

interface UriPickItem extends vscode.QuickPickItem {
  uri?: vscode.Uri;
}

function resourceUri(value: CommandTarget): vscode.Uri | undefined {
  return value instanceof vscode.Uri ? value : value?.resourceUri;
}

async function openDataMap(uri: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand('vscode.openWith', uri, 'biztalkDataMapper.mapEditor');
}

async function browseForFolder(openLabel: string, title: string): Promise<vscode.Uri | undefined> {
  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel,
    title,
  });
  return selected?.[0];
}

// Adds a project folder to the current window, or opens it when no folder is open yet.
async function showProjectInWorkspace(projectUri: vscode.Uri): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (vscode.workspace.getWorkspaceFolder(projectUri)) {
    return;
  }
  if (folders.length === 0) {
    await vscode.commands.executeCommand('vscode.openFolder', projectUri, false);
    return;
  }
  vscode.workspace.updateWorkspaceFolders(folders.length, 0, { uri: projectUri });
}

export async function addMapperProject(onChanged: () => void): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  let parentUri: vscode.Uri | undefined;
  if (folders.length === 0) {
    parentUri = await browseForFolder('Select Folder', 'Select the folder to create the mapper project in');
  } else {
    const items: UriPickItem[] = [
      ...folders.map((folder) => ({ label: folder.name, description: folder.uri.fsPath, uri: folder.uri })),
      { label: '$(folder-opened) Browse...', description: 'Choose a different folder' },
    ];
    const picked = await vscode.window.showQuickPick(items, {
      title: 'Add Mapper Project',
      placeHolder: 'Select the workspace folder for the new mapper project',
    });
    if (!picked) {
      return;
    }
    parentUri = picked.uri ?? (await browseForFolder('Select Folder', 'Select the folder to create the mapper project in'));
  }
  if (!parentUri) {
    return;
  }

  const existingNames = new Set((await readDirectoryNames(parentUri)).map((name) => name.toLocaleLowerCase()));
  const name = await vscode.window.showInputBox({
    title: 'Add Mapper Project',
    prompt: 'Enter the mapper project name',
    value: getDuplicateSafeName('MapperProject', '', existingNames),
    validateInput: (value) =>
      validateWorkspaceName(value) ??
      (existingNames.has(value.trim().toLocaleLowerCase()) ? `A folder named "${value.trim()}" already exists.` : undefined),
  });
  if (!name) {
    return;
  }

  const { rootUri, mapUri } = await createMapperProject(parentUri, name);
  onChanged();
  if (vscode.workspace.getWorkspaceFolder(rootUri)) {
    await openDataMap(mapUri);
  } else {
    await showProjectInWorkspace(rootUri);
  }
}

export async function openExistingMapper(onChanged: () => void): Promise<void> {
  const projectUri = await browseForFolder('Open Mapper Project', 'Select an existing mapper project folder');
  if (!projectUri) {
    return;
  }
  if (!(await isMapperProject(projectUri))) {
    vscode.window.showWarningMessage('The selected folder is not a mapper project: no Schemas folder or .btm file was found.');
    return;
  }
  await showProjectInWorkspace(projectUri);
  onChanged();
}

export async function addDataMap(value: CommandTarget, onChanged: () => void): Promise<void> {
  let project: { name: string; uri: vscode.Uri } | undefined;
  const selectedUri = resourceUri(value);
  if (selectedUri) {
    const uri = getWorkspaceRoot(selectedUri);
    project = { name: uri.path.split('/').filter(Boolean).pop() ?? uri.fsPath, uri };
  } else {
    const projects = await findMapperProjects();
    if (projects.length === 0) {
      const action = await vscode.window.showWarningMessage('No mapper project found in the workspace.', 'Add Mapper Project');
      if (action) {
        await vscode.commands.executeCommand('biztalkDataMapper.newMap');
      }
      return;
    }
    if (projects.length === 1) {
      project = projects[0];
    } else {
      const picked = await vscode.window.showQuickPick(
        projects.map((candidate) => ({ label: candidate.name, description: candidate.uri.fsPath, project: candidate })),
        { title: 'Add Data Map', placeHolder: 'Select the workspace to add the map to' }
      );
      project = picked?.project;
    }
  }
  if (!project) {
    return;
  }

  const existingNames = await readDirectoryNames(project.uri);
  const input = await vscode.window.showInputBox({
    title: `Add Data Map to ${project.name}`,
    prompt: 'Enter the map file name',
    value: normalizeMapName(getDuplicateSafeName('map', '.btm', existingNames)),
    validateInput: (candidate) => validateMapName(candidate, existingNames),
  });
  if (!input) {
    return;
  }

  const mapUri = await createEmptyMap(project.uri, normalizeMapName(input));
  onChanged();
  await openDataMap(mapUri);
}
