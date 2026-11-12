import { IMPORT_MAP_BROWSE_DIRECTORY_KEY, getSelectedFileDirectory } from './browseLocation';
import * as fs from 'fs';
import * as path from 'path';
import { planLmlImport } from './lml/lmlImportPlanner';
import { lmlEditorViewType } from './lml/editorProtocol';
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

export interface MapCommandOptions {
  viewType?: string;
  lmlViewType?: string;
  btmOnly?: boolean;
  requireExistingProject?: boolean;
}

interface UriPickItem extends vscode.QuickPickItem {
  uri?: vscode.Uri;
}

function resourceUri(value: CommandTarget): vscode.Uri | undefined {
  if (value && 'fsPath' in value) {
    return value;
  }
  if (value && 'resourceUri' in value) {
    return value.resourceUri;
  }
  return undefined;
}

async function openDataMap(uri: vscode.Uri, options?: MapCommandOptions): Promise<void> {
  await vscode.commands.executeCommand(
    'vscode.openWith',
    uri,
    uri.path.toLowerCase().endsWith('.lml')
      ? (options?.lmlViewType ?? lmlEditorViewType)
      : (options?.viewType ?? 'biztalkDataMapper.mapEditor')
  );
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

export async function addDataMap(value: CommandTarget, onChanged: () => void, options?: MapCommandOptions): Promise<void> {
  let project: { name: string; uri: vscode.Uri } | undefined;
  const selectedUri = resourceUri(value);
  if (selectedUri) {
    const uri = getWorkspaceRoot(selectedUri);
    if (options?.requireExistingProject && !(await isMapperProject(uri))) {
      throw new Error('The selected folder is not a mapper project.');
    }
    project = { name: uri.path.split('/').filter(Boolean).pop() ?? uri.fsPath, uri };
  } else {
    const projects = await findMapperProjects();
    if (projects.length === 0) {
      if (options?.requireExistingProject) {
        throw new Error('No mapper project found in the workspace.');
      }
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
  await openDataMap(mapUri, options);
}

async function pathExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

// Copies an imported map and its referenced schemas into the project.
export async function importExistingMap(
  value: CommandTarget,
  onChanged: () => void,
  context: vscode.ExtensionContext,
  options?: MapCommandOptions
): Promise<void> {
  const rememberedDirectory = context.globalState.get<string>(IMPORT_MAP_BROWSE_DIRECTORY_KEY);
  const selected = await vscode.window.showOpenDialog({
    defaultUri: rememberedDirectory ? vscode.Uri.file(rememberedDirectory) : undefined,
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: { 'Data Maps': options?.btmOnly ? ['btm'] : ['btm', 'lml'] },
    openLabel: 'Import Map',
    title: options?.btmOnly ? 'Select the map (.btm) to import' : 'Select the map (.btm or .lml) to import',
  });
  if (!selected?.[0]) {
    return;
  }
  if (options?.btmOnly && !selected[0].path.toLowerCase().endsWith('.btm')) {
    throw new Error('Only BTM maps can be imported into this mapper.');
  }
  await context.globalState.update(IMPORT_MAP_BROWSE_DIRECTORY_KEY, getSelectedFileDirectory(selected[0].fsPath));

  const isLml = selected[0].path.toLowerCase().endsWith('.lml');
  const extension = isLml ? '.lml' : '.btm';

  let projectUri: vscode.Uri | undefined;
  const selectedUri = resourceUri(value);
  if (selectedUri) {
    projectUri = getWorkspaceRoot(selectedUri);
    if (options?.requireExistingProject && !(await isMapperProject(projectUri))) {
      throw new Error('The selected folder is not a mapper project.');
    }
  } else {
    const projects = await findMapperProjects();
    if (projects.length === 0) {
      if (options?.requireExistingProject) {
        throw new Error('No mapper project found in the workspace.');
      }
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
  const artifactsUri = vscode.Uri.joinPath(projectUri, 'Artifacts');
  const existingNames = await readDirectoryNames(projectUri);
  if (!isLml) {
    for (const name of await readDirectoryNames(artifactsUri)) {
      existingNames.push(`${name}${extension}`);
    }
  }
  const sourceName = path.basename(selected[0].fsPath, path.extname(selected[0].fsPath));
  const mapFileName = getDuplicateSafeName(sourceName, extension, existingNames);
  const destinationMapName = mapFileName.slice(0, -extension.length);
  if (!isLml) {
    const nameError = validateWorkspaceName(destinationMapName);
    if (nameError) {
      throw new Error(nameError);
    }
  }
  const mapUri = vscode.Uri.joinPath(projectUri, mapFileName);
  let plan: MapImportPlan;
  try {
    plan = isLml
      ? planLmlImport(selected[0].fsPath)
      : planMapImport(selected[0].fsPath, undefined, { destinationMapName, schemasDirectory: schemasUri.fsPath });
  } catch (error) {
    vscode.window.showErrorMessage(`Could not import "${selected[0].fsPath}": ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const filesToWrite: { uri: vscode.Uri; data: Buffer }[] = [];
  const conflicts: { uri: vscode.Uri; data: Buffer; relativePath: string }[] = [];
  for (const schemaFile of plan.schemaFiles) {
    const uri = vscode.Uri.joinPath(schemasUri, ...schemaFile.relativePath.split('/'));
    if (!isLml) {
      filesToWrite.push({ uri, data: schemaFile.data });
      continue;
    }
    if (!(await pathExists(uri))) {
      filesToWrite.push({ uri, data: schemaFile.data });
    } else if (Buffer.compare(Buffer.from(await vscode.workspace.fs.readFile(uri)), schemaFile.data) !== 0) {
      conflicts.push({ uri, data: schemaFile.data, relativePath: schemaFile.relativePath });
    }
  }
  for (const artifact of plan.artifactFiles ?? []) {
    filesToWrite.push({ uri: vscode.Uri.joinPath(artifactsUri, ...artifact.relativePath.split('/')), data: artifact.data });
  }
  if (conflicts.length > 0) {
    vscode.window.showErrorMessage(
      `LML import would replace existing schemas: ${conflicts.map((conflict) => conflict.relativePath).join(', ')}. Import into a separate mapper project to keep existing maps unchanged.`
    );
    return;
  }

  const createdScopes: vscode.Uri[] = [];
  const createdSchemas: string[] = [];
  let createdMap = false;
  try {
    if (!isLml) {
      if (plan.artifactFiles?.length) {
        await vscode.workspace.fs.createDirectory(artifactsUri);
        const scope = vscode.Uri.joinPath(artifactsUri, destinationMapName);
        await fs.promises.mkdir(scope.fsPath);
        createdScopes.push(scope);
      }
      const destinations = new Set<string>();
      for (const file of filesToWrite) {
        const destination = path.resolve(file.uri.fsPath).toLocaleLowerCase();
        if (
          destinations.has(destination) ||
          !(
            path.resolve(path.dirname(file.uri.fsPath)) === path.resolve(schemasUri.fsPath) ||
            createdScopes.some((scope) => {
              const relative = path.relative(scope.fsPath, file.uri.fsPath);
              return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
            })
          )
        ) {
          throw new Error(`Unsafe or duplicate imported dependency path: ${file.uri.fsPath}`);
        }
        destinations.add(destination);
      }
    }
    for (const file of filesToWrite) {
      await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(file.uri, '..'));
      if (isLml) {
        await vscode.workspace.fs.writeFile(file.uri, file.data);
      } else {
        const handle = await fs.promises.open(file.uri.fsPath, 'wx');
        if (path.resolve(path.dirname(file.uri.fsPath)) === path.resolve(schemasUri.fsPath)) {
          createdSchemas.push(file.uri.fsPath);
        }
        try {
          await handle.writeFile(file.data);
        } finally {
          await handle.close();
        }
      }
    }
    if (isLml) {
      await vscode.workspace.fs.writeFile(mapUri, Buffer.from(plan.mapContent, 'utf8'));
    } else {
      const handle = await fs.promises.open(mapUri.fsPath, 'wx');
      createdMap = true;
      try {
        await handle.writeFile(plan.mapContent, { encoding: 'utf8' });
      } finally {
        await handle.close();
      }
    }
  } catch (error) {
    if (createdMap) {
      await fs.promises.unlink(mapUri.fsPath).catch(() => undefined);
    }
    for (const schemaPath of createdSchemas.reverse()) {
      await fs.promises.unlink(schemaPath).catch(() => undefined);
    }
    for (const scope of createdScopes.reverse()) {
      await Promise.resolve(vscode.workspace.fs.delete(scope, { recursive: true })).catch(() => undefined);
    }
    throw error;
  }
  onChanged();

  const summary = `Imported "${mapFileName}" with ${plan.schemaFiles.length} schema file(s) and ${plan.artifactFiles?.length ?? 0} custom artifact file(s).`;
  if (plan.warnings.length > 0) {
    vscode.window.showWarningMessage(`${summary} ${plan.warnings.join(' ')}`);
  } else {
    vscode.window.showInformationMessage(summary);
  }
  if (vscode.workspace.getWorkspaceFolder(projectUri)) {
    await openDataMap(mapUri, options);
  } else {
    await showProjectInWorkspace(projectUri);
  }
}
