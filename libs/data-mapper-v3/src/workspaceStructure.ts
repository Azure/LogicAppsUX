import * as path from 'path';
import * as vscode from 'vscode';
import { BtmSerializer } from './schema/btmSerializer';
import { planSchemaImport } from './schema/mapImportPlanner';

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

// Lists every .xsd under the Schemas folder as a posix path relative to it.
export async function listWorkspaceSchemas(mapUri: vscode.Uri): Promise<string[]> {
  const schemasUri = vscode.Uri.joinPath(getWorkspaceRootForMap(mapUri), schemasFolderName);
  const schemas: string[] = [];
  const visit = async (folderUri: vscode.Uri, prefix: string): Promise<void> => {
    for (const [name, type] of await readDirectoryEntries(folderUri)) {
      if (type & vscode.FileType.Directory) {
        await visit(vscode.Uri.joinPath(folderUri, name), `${prefix}${name}/`);
      } else if (path.extname(name).toLocaleLowerCase() === '.xsd') {
        schemas.push(`${prefix}${name}`);
      }
    }
  };
  await visit(schemasUri, '');
  return schemas.sort((left, right) => left.localeCompare(right));
}

export interface CopiedSchema {
  // Path of the requested schema relative to the map's folder, e.g. "Schemas/Order.xsd".
  relativePath: string;
  // Files newly created by the copy; existing files that were overwritten are not listed.
  createdUris: vscode.Uri[];
  warnings: string[];
}

async function tryReadFile(uri: vscode.Uri): Promise<Buffer | undefined> {
  try {
    return Buffer.from(await vscode.workspace.fs.readFile(uri));
  } catch {
    return undefined;
  }
}

// Copies a schema into the map's Schemas folder together with every schema it imports or includes, so it loads completely.
// Returns undefined when the user cancels.
export async function copySchemaWithDependencies(sourceUri: vscode.Uri, mapUri: vscode.Uri): Promise<CopiedSchema | undefined> {
  const schemasUri = vscode.Uri.joinPath(getWorkspaceRootForMap(mapUri), schemasFolderName);
  const plan = planSchemaImport(sourceUri.fsPath);
  const toUri = (relativePath: string): vscode.Uri => vscode.Uri.joinPath(schemasUri, ...relativePath.split('/'));

  let rootRelativePath = plan.rootRelativePath;
  const writes: { uri: vscode.Uri; data: Buffer; isNew: boolean }[] = [];
  const conflicts: { uri: vscode.Uri; data: Buffer; relativePath: string }[] = [];
  for (const file of plan.schemaFiles) {
    const uri = toUri(file.relativePath);
    const existing = await tryReadFile(uri);
    if (!existing) {
      writes.push({ uri, data: file.data, isNew: true });
    } else if (Buffer.compare(existing, file.data) !== 0) {
      if (file.relativePath === plan.rootRelativePath) {
        // Keep the existing schema and add the new one alongside it under a unique name.
        const folderUri = vscode.Uri.joinPath(uri, '..');
        const extension = path.posix.extname(file.relativePath) || '.xsd';
        const fileName = getDuplicateSafeName(
          path.posix.basename(file.relativePath, extension),
          extension,
          await readDirectoryNames(folderUri)
        );
        const folder = path.posix.dirname(file.relativePath);
        rootRelativePath = folder === '.' ? fileName : `${folder}/${fileName}`;
        writes.push({ uri: vscode.Uri.joinPath(folderUri, fileName), data: file.data, isNew: true });
      } else {
        conflicts.push({ uri, data: file.data, relativePath: file.relativePath });
      }
    }
  }

  if (conflicts.length > 0) {
    const overwrite = 'Overwrite';
    const keep = 'Keep Existing';
    const choice = await vscode.window.showWarningMessage(
      `${conflicts.length} referenced schema file(s) already exist in ${schemasFolderName} with different content: ${conflicts
        .map((conflict) => conflict.relativePath)
        .join(', ')}`,
      { modal: true },
      overwrite,
      keep
    );
    if (!choice) {
      return undefined;
    }
    if (choice === overwrite) {
      writes.push(...conflicts.map((conflict) => ({ uri: conflict.uri, data: conflict.data, isNew: false })));
    }
  }

  const createdUris: vscode.Uri[] = [];
  for (const write of writes) {
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(write.uri, '..'));
    await vscode.workspace.fs.writeFile(write.uri, write.data);
    if (write.isNew) {
      createdUris.push(write.uri);
    }
  }
  return { relativePath: `${schemasFolderName}/${rootRelativePath}`, createdUris, warnings: plan.warnings };
}

export async function getXsltOutputUri(mapUri: vscode.Uri, suffix = ''): Promise<vscode.Uri> {
  const rootUri = getWorkspaceRootForMap(mapUri);
  const xsltUri = vscode.Uri.joinPath(rootUri, generatedFolderName);
  await vscode.workspace.fs.createDirectory(xsltUri);
  const mapName = path.posix.basename(mapUri.path, path.posix.extname(mapUri.path));
  return vscode.Uri.joinPath(xsltUri, `${mapName}${suffix}.xslt`);
}
