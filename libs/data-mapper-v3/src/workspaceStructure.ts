import * as path from 'path';
import * as vscode from 'vscode';
import { BtmSerializer } from './schema/btmSerializer';

export const schemasFolderName = 'Schemas';
export const generatedFolderName = '__generated';
export const defaultMapBaseName = 'map';

export function validateWorkspaceName(value: string): string | undefined {
  const name = value.trim();
  if (!name) {
    return 'Enter a workspace name.';
  }
  if (name !== value) {
    return 'Workspace names cannot start or end with spaces.';
  }
  const hasControlCharacter = Array.from(name).some((character) => character.charCodeAt(0) < 32);
  if (name === '.' || name === '..' || /[<>:"/\\|?*]/.test(name) || hasControlCharacter || /[. ]$/.test(name)) {
    return 'Enter a valid folder name.';
  }
  const nameWithoutExtension = name.split('.')[0].toLocaleUpperCase();
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(nameWithoutExtension)) {
    return 'Enter a valid folder name.';
  }
  return undefined;
}

export function getDuplicateSafeName(baseName: string, extension: string, existingNames: Iterable<string>): string {
  const normalizedNames = new Set(Array.from(existingNames, (name) => name.toLocaleLowerCase()));
  const initialName = `${baseName}${extension}`;
  if (!normalizedNames.has(initialName.toLocaleLowerCase())) {
    return initialName;
  }

  for (let index = 1; ; index++) {
    const candidate = `${baseName}(${index})${extension}`;
    if (!normalizedNames.has(candidate.toLocaleLowerCase())) {
      return candidate;
    }
  }
}

export function getWorkspaceRoot(resource: vscode.Uri): vscode.Uri {
  const baseName = path.posix.basename(resource.path);
  if (baseName.toLocaleLowerCase() === schemasFolderName.toLocaleLowerCase() || baseName.toLocaleLowerCase() === generatedFolderName) {
    return vscode.Uri.joinPath(resource, '..');
  }
  const extension = path.posix.extname(baseName).toLocaleLowerCase();
  if (extension === '.btm' || extension === '.xsd') {
    return vscode.Uri.joinPath(resource, '..');
  }
  return resource;
}

export function getWorkspaceRootForMap(mapUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(mapUri, '..');
}

export async function ensureWorkspaceFolders(rootUri: vscode.Uri): Promise<void> {
  await Promise.all([
    vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(rootUri, schemasFolderName)),
    vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(rootUri, generatedFolderName)),
  ]);
}

async function readDirectoryEntries(folderUri: vscode.Uri): Promise<[string, vscode.FileType][]> {
  try {
    return await vscode.workspace.fs.readDirectory(folderUri);
  } catch (error) {
    if ((error as { code?: string }).code === 'FileNotFound') {
      return [];
    }
    throw error;
  }
}

export async function readDirectoryNames(folderUri: vscode.Uri): Promise<string[]> {
  return (await readDirectoryEntries(folderUri)).map(([name]) => name);
}

export interface MapperProject {
  name: string;
  uri: vscode.Uri;
}

function isMapperProjectEntries(entries: [string, vscode.FileType][]): boolean {
  return entries.some(
    ([name, type]) =>
      (type & vscode.FileType.Directory && name.toLocaleLowerCase() === schemasFolderName.toLocaleLowerCase()) ||
      name.toLocaleLowerCase().endsWith('.btm')
  );
}

export async function isMapperProject(folderUri: vscode.Uri): Promise<boolean> {
  return isMapperProjectEntries(await readDirectoryEntries(folderUri));
}

// A mapper project is a workspace folder (or one of its direct child folders) holding a Schemas folder or a .btm file.
export async function findMapperProjects(): Promise<MapperProject[]> {
  const projects: MapperProject[] = [];
  for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
    const entries = await readDirectoryEntries(workspaceFolder.uri);
    if (isMapperProjectEntries(entries)) {
      projects.push({ name: workspaceFolder.name, uri: workspaceFolder.uri });
    }
    const ignoredFolders = new Set([schemasFolderName.toLocaleLowerCase(), generatedFolderName, 'node_modules']);
    for (const [name, type] of entries) {
      if (!(type & vscode.FileType.Directory) || name.startsWith('.') || ignoredFolders.has(name.toLocaleLowerCase())) {
        continue;
      }
      const childUri = vscode.Uri.joinPath(workspaceFolder.uri, name);
      if (await isMapperProject(childUri)) {
        projects.push({ name, uri: childUri });
      }
    }
  }
  return projects;
}

export function normalizeMapName(value: string): string {
  const name = value.trim();
  return name.toLocaleLowerCase().endsWith('.btm') ? name.slice(0, -'.btm'.length) : name;
}

export function validateMapName(value: string, existingNames: Iterable<string>): string | undefined {
  const name = normalizeMapName(value);
  if (!name) {
    return 'Enter a file name.';
  }
  if (validateWorkspaceName(name)) {
    return 'Enter a valid file name.';
  }
  const fileName = `${name}.btm`;
  if (Array.from(existingNames, (existing) => existing.toLocaleLowerCase()).includes(fileName.toLocaleLowerCase())) {
    return `A map named "${fileName}" already exists in this project.`;
  }
  return undefined;
}

export async function createMapperProject(parentUri: vscode.Uri, name: string): Promise<{ rootUri: vscode.Uri; mapUri: vscode.Uri }> {
  const rootUri = vscode.Uri.joinPath(parentUri, name.trim());
  const mapUri = await createEmptyMap(rootUri);
  return { rootUri, mapUri };
}

export async function createEmptyMap(rootUri: vscode.Uri, baseName = defaultMapBaseName): Promise<vscode.Uri> {
  await ensureWorkspaceFolders(rootUri);
  const existingNames = await readDirectoryNames(rootUri);
  const fileName = getDuplicateSafeName(baseName, '.btm', existingNames);
  const mapUri = vscode.Uri.joinPath(rootUri, fileName);
  const serializer = new BtmSerializer();
  const map = serializer.createNew('', '', path.basename(fileName, '.btm'));
  await vscode.workspace.fs.writeFile(mapUri, Buffer.from(serializer.serialize(map), 'utf8'));
  return mapUri;
}

export async function listWorkspaceSchemas(mapUri: vscode.Uri): Promise<string[]> {
  const schemasUri = vscode.Uri.joinPath(getWorkspaceRootForMap(mapUri), schemasFolderName);
  const entries = await readDirectoryNames(schemasUri);
  return entries.filter((name) => path.extname(name).toLocaleLowerCase() === '.xsd').sort((left, right) => left.localeCompare(right));
}

export async function copySchemaToWorkspace(sourceUri: vscode.Uri, mapUri: vscode.Uri): Promise<{ uri: vscode.Uri; relativePath: string }> {
  const rootUri = getWorkspaceRootForMap(mapUri);
  const schemasUri = vscode.Uri.joinPath(rootUri, schemasFolderName);
  await vscode.workspace.fs.createDirectory(schemasUri);
  const existingNames = await readDirectoryNames(schemasUri);
  const extension = path.posix.extname(sourceUri.path) || '.xsd';
  const baseName = path.posix.basename(sourceUri.path, extension);
  const fileName = getDuplicateSafeName(baseName, extension, existingNames);
  const destinationUri = vscode.Uri.joinPath(schemasUri, fileName);
  await vscode.workspace.fs.copy(sourceUri, destinationUri, { overwrite: false });
  return { uri: destinationUri, relativePath: `${schemasFolderName}/${fileName}` };
}

export async function getXsltOutputUri(mapUri: vscode.Uri, suffix = ''): Promise<vscode.Uri> {
  const rootUri = getWorkspaceRootForMap(mapUri);
  const xsltUri = vscode.Uri.joinPath(rootUri, generatedFolderName);
  await vscode.workspace.fs.createDirectory(xsltUri);
  const mapName = path.posix.basename(mapUri.path, path.posix.extname(mapUri.path));
  return vscode.Uri.joinPath(xsltUri, `${mapName}${suffix}.xslt`);
}
