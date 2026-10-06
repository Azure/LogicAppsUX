import { planMapImport } from './schema/mapImportPlanner';
import type { MapImportPlan } from './schema/mapImportPlanner';
import {
  createEmptyMap,
  createMapperProject,
  ensureWorkspaceFolders,
  findMapperProjects,
  getDuplicateSafeName,
  getWorkspaceRoot,
  isMapperProject,
  normalizeMapName,
  readDirectoryNames,
  schemasFolderName,
  validateMapName,
  validateWorkspaceName,
} from './workspaceStructure';
import * as vscode from 'vscode';

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

// Asks where to create a new mapper project and what to call it.
async function promptForNewProject(title: string): Promise<{ parentUri: vscode.Uri; name: string } | undefined> {
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
      title,
      placeHolder: 'Select the workspace folder for the new mapper project',
    });
    if (!picked) {
      return undefined;
    }
    parentUri = picked.uri ?? (await browseForFolder('Select Folder', 'Select the folder to create the mapper project in'));
  }
  if (!parentUri) {
    return undefined;
  }

  const existingNames = new Set((await readDirectoryNames(parentUri)).map((name) => name.toLocaleLowerCase()));
  const name = await vscode.window.showInputBox({
    title,
    prompt: 'Enter the mapper project name',
    value: getDuplicateSafeName('MapperProject', '', existingNames),
    validateInput: (value) =>
      validateWorkspaceName(value) ??
      (existingNames.has(value.trim().toLocaleLowerCase()) ? `A folder named "${value.trim()}" already exists.` : undefined),
  });
  return name ? { parentUri, name: name.trim() } : undefined;
}

export async function addMapperProject(onChanged: () => void): Promise<void> {
  const newProject = await promptForNewProject('Add Mapper Project');
  if (!newProject) {
    return;
  }

  const { rootUri, mapUri } = await createMapperProject(newProject.parentUri, newProject.name);
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

async function pathExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

// Imports a .btm from outside the project: copies the map and the schemas it references (with their imports) into the project.
export async function importExistingMap(value: CommandTarget, onChanged: () => void): Promise<void> {
  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: { 'BizTalk Map': ['btm'] },
    openLabel: 'Import Map',
    title: 'Select the map (.btm) to import',
  });
  if (!selected?.[0]) {
    return;
  }

  let plan: MapImportPlan;
  try {
    plan = planMapImport(selected[0].fsPath);
  } catch (error) {
    vscode.window.showErrorMessage(`Could not import "${selected[0].fsPath}": ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  let projectUri: vscode.Uri | undefined;
  const selectedUri = resourceUri(value);
  if (selectedUri) {
    projectUri = getWorkspaceRoot(selectedUri);
  } else {
    const projects = await findMapperProjects();
    if (projects.length === 0) {
      const newProject = await promptForNewProject('Import Existing Map');
      projectUri = newProject ? vscode.Uri.joinPath(newProject.parentUri, newProject.name) : undefined;
    } else if (projects.length === 1) {
      projectUri = projects[0].uri;
    } else {
      const picked = await vscode.window.showQuickPick(
        projects.map((candidate) => ({ label: candidate.name, description: candidate.uri.fsPath, project: candidate })),
        { title: 'Import Existing Map', placeHolder: 'Select the workspace to import the map into' }
      );
      projectUri = picked?.project.uri;
    }
  }
  if (!projectUri) {
    return;
  }

  await ensureWorkspaceFolders(projectUri);
  const schemasUri = vscode.Uri.joinPath(projectUri, schemasFolderName);
  const filesToWrite: { uri: vscode.Uri; data: Buffer }[] = [];
  const conflicts: { uri: vscode.Uri; data: Buffer; relativePath: string }[] = [];
  for (const schemaFile of plan.schemaFiles) {
    const uri = vscode.Uri.joinPath(schemasUri, ...schemaFile.relativePath.split('/'));
    if (!(await pathExists(uri))) {
      filesToWrite.push({ uri, data: schemaFile.data });
    } else if (Buffer.compare(Buffer.from(await vscode.workspace.fs.readFile(uri)), schemaFile.data) !== 0) {
      conflicts.push({ uri, data: schemaFile.data, relativePath: schemaFile.relativePath });
    }
  }
  if (conflicts.length > 0) {
    const overwrite = 'Overwrite';
    const keep = 'Keep Existing';
    const choice = await vscode.window.showWarningMessage(
      `${conflicts.length} schema file(s) already exist in ${schemasFolderName} with different content: ${conflicts
        .map((conflict) => conflict.relativePath)
        .join(', ')}`,
      { modal: true },
      overwrite,
      keep
    );
    if (!choice) {
      return;
    }
    if (choice === overwrite) {
      filesToWrite.push(...conflicts);
    }
  }

  for (const file of filesToWrite) {
    await vscode.workspace.fs.writeFile(file.uri, file.data);
  }
  const existingNames = await readDirectoryNames(projectUri);
  const mapUri = vscode.Uri.joinPath(projectUri, getDuplicateSafeName(plan.mapName, '.btm', existingNames));
  await vscode.workspace.fs.writeFile(mapUri, Buffer.from(plan.mapContent, 'utf8'));
  onChanged();

  const summary = `Imported "${plan.mapName}.btm" with ${plan.schemaFiles.length} schema file(s).`;
  if (plan.warnings.length > 0) {
    vscode.window.showWarningMessage(`${summary} ${plan.warnings.join(' ')}`);
  } else {
    vscode.window.showInformationMessage(summary);
  }
  if (vscode.workspace.getWorkspaceFolder(projectUri)) {
    await openDataMap(mapUri);
  } else {
    await showProjectInWorkspace(projectUri);
  }
}
