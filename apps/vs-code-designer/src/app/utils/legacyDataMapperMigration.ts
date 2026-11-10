import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createWorkspaceMapperProject } from 'btm-data-mapper/embedded';
import { parse, type ParseError } from 'jsonc-parser';
import * as vscode from 'vscode';
import { localize } from '../../localize';
import { showLegacyDataMapperMigrationDialog } from './legacyDataMapperMigrationDialog';
import { getWorkspaceLogicAppRoots } from './workspace';

interface LegacyFile {
  source: string;
  relative: string;
  content: Buffer;
}

const attemptedProjects = new Set<string>();
let pendingMigration: Promise<boolean> | undefined;

function requireTrust(): void {
  if (!vscode.workspace.isTrusted) {
    throw new Error(localize('legacyMapperTrust', 'Trust this workspace before converting legacy mapper elements.'));
  }
}

async function optionalStat(filename: string) {
  return fs.lstat(filename).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    return undefined;
  });
}

async function collectFiles(source: string, relative: string, files: LegacyFile[]): Promise<boolean> {
  const stat = await optionalStat(source);
  if (!stat) {
    return false;
  }
  if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) {
    throw new Error(localize('legacyMapperLinkedFiles', 'Legacy mapper conversion cannot use linked files or directories.'));
  }
  if (stat.isDirectory()) {
    for (const entry of await fs.readdir(source)) {
      await collectFiles(path.join(source, entry), path.join(relative, entry), files);
    }
  } else if (stat.isFile()) {
    files.push({ source, relative, content: await fs.readFile(source) });
  } else {
    throw new Error(localize('legacyMapperUnsupportedFile', 'Unsupported legacy mapper file: {0}', source));
  }
  return true;
}

function validateWorkspaceName(value: string): string | undefined {
  const hasControlCharacter = Array.from(value).some((character) => character.charCodeAt(0) < 32);
  if (!value.trim() || value !== value.trim() || /[<>:"/\\|?*]/.test(value) || hasControlCharacter || /[. ]$/.test(value)) {
    return localize('legacyMapperWorkspaceName', 'Enter a valid workspace name.');
  }
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(value)) {
    return localize('legacyMapperReservedWorkspaceName', 'This workspace name is reserved.');
  }
  return undefined;
}

async function verifyFiles(files: LegacyFile[], destination?: string): Promise<void> {
  requireTrust();
  if (!destination) {
    const sources = new Set(files.map((file) => vscode.Uri.file(file.source).toString()));
    if (vscode.workspace.textDocuments.some((document) => document.isDirty && sources.has(document.uri.toString()))) {
      throw new Error(localize('legacyMapperDirtyFiles', 'Save the legacy mapper files before converting this project.'));
    }
  }
  for (const file of files) {
    const filename = destination ? path.join(destination, file.relative) : file.source;
    const stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || !file.content.equals(await fs.readFile(filename))) {
      throw new Error(localize('legacyMapperChanged', 'A mapper file changed during conversion. Original files have not been removed.'));
    }
  }
}

async function migrateProject(project: string): Promise<boolean> {
  requireTrust();
  for (const directory of [project, path.join(project, 'Artifacts')]) {
    if ((await optionalStat(directory))?.isSymbolicLink()) {
      throw new Error(localize('legacyMapperLinkedFiles', 'Legacy mapper conversion cannot use linked files or directories.'));
    }
  }
  const files: LegacyFile[] = [];
  const definitions = path.join(project, 'Artifacts', 'MapDefinitions');
  const mapperAssets = path.join(project, 'Artifacts', 'DataMapper');
  const hasDefinitions = await collectFiles(definitions, '', files);
  const hasMapperAssets = await collectFiles(mapperAssets, path.join('Artifacts', 'DataMapper'), files);
  const metadataFolder = path.join(project, '.vscode');
  const metadata: LegacyFile[] = [];
  const metadataStat = await optionalStat(metadataFolder);
  if (metadataStat?.isSymbolicLink()) {
    throw new Error(localize('legacyMapperLinkedFiles', 'Legacy mapper conversion cannot use linked files or directories.'));
  }
  if (metadataStat?.isDirectory()) {
    for (const name of await fs.readdir(metadataFolder)) {
      if (/(?:data)?mapmetadata-v2\.json$/i.test(name)) {
        await collectFiles(path.join(metadataFolder, name), path.join('.vscode', name), metadata);
      }
    }
  }
  if (!hasDefinitions && !hasMapperAssets && metadata.length === 0) {
    return false;
  }
  const key = process.platform === 'win32' ? project.toLowerCase() : project;
  if (attemptedProjects.has(key)) {
    return false;
  }
  attemptedProjects.add(key);
  const projectName = path.basename(project);
  const currentWorkspace = vscode.workspace.workspaceFile;
  if (currentWorkspace && currentWorkspace.scheme !== 'file' && currentWorkspace.scheme !== 'untitled') {
    throw new Error(localize('legacyMapperSaveWorkspace', 'Save this workspace to a local workspace file before converting legacy maps.'));
  }
  const savedWorkspace = currentWorkspace?.scheme === 'file' ? currentWorkspace : undefined;
  const workspaceRoot = savedWorkspace ? path.dirname(savedWorkspace.fsPath) : path.dirname(project);
  return showLegacyDataMapperMigrationDialog({
    projectName,
    needsWorkspaceName: !savedWorkspace,
    validateWorkspaceName: async (value) => {
      const error = validateWorkspaceName(value);
      if (error) {
        return error;
      }
      return (await optionalStat(path.join(workspaceRoot, `${value}.code-workspace`)))
        ? localize('legacyMapperWorkspaceExists', 'A workspace with this name already exists.')
        : undefined;
    },
    convert: async (workspaceName, progress) => {
      progress.report({ message: localize('legacyMapperPreparing', 'Preparing {0} for conversion...', projectName), increment: 5 });
      const legacyFiles = [...files];
      const verifyLegacyFolders = async (): Promise<void> => {
        const current: LegacyFile[] = [];
        await collectFiles(definitions, '', current);
        await collectFiles(mapperAssets, path.join('Artifacts', 'DataMapper'), current);
        const expected = new Set(legacyFiles.map((file) => file.source));
        if (current.length !== legacyFiles.length || current.some((file) => !expected.has(file.source))) {
          throw new Error(
            localize('legacyMapperFolderChanged', 'Legacy mapper folders changed during conversion. Retry with the current files.')
          );
        }
        await verifyFiles(legacyFiles);
      };
      await collectFiles(path.join(project, 'Artifacts', 'Schemas'), 'Schemas', files);
      files.push(...metadata);
      let newWorkspace: string | undefined;
      let workspaceContents: Record<string, unknown> = {};
      if (!savedWorkspace) {
        newWorkspace = path.join(workspaceRoot, `${workspaceName}.code-workspace`);
        if (currentWorkspace) {
          const errors: ParseError[] = [];
          const contents: unknown = parse(
            Buffer.from(await vscode.workspace.fs.readFile(currentWorkspace.with({ scheme: 'file' }))).toString('utf8'),
            errors
          );
          if (errors.length || !contents || typeof contents !== 'object' || Array.isArray(contents)) {
            throw new Error(
              localize('legacyMapperInvalidWorkspace', 'Save the current workspace before converting legacy mapper elements.')
            );
          }
          workspaceContents = contents as Record<string, unknown>;
        }
      }
      requireTrust();
      await verifyFiles(files);
      let destination = path.join(workspaceRoot, `${projectName}Mapper`);
      for (let suffix = 1; ; suffix++) {
        try {
          await fs.mkdir(destination);
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
            throw error;
          }
          destination = path.join(workspaceRoot, `${projectName}Mapper${suffix}`);
        }
      }
      let committed = false;
      let createdWorkspace = false;
      try {
        progress.report({ message: localize('legacyMapperCreating', 'Creating the mapper project...'), increment: 10 });
        const emptyMap = await createWorkspaceMapperProject(vscode.Uri.file(destination), 'map');
        await fs.unlink(emptyMap.fsPath);
        let copiedFiles = 0;
        for (const file of files) {
          progress.report({
            message: localize('legacyMapperCopying', 'Copying maps, schemas, and metadata ({0}/{1})...', copiedFiles + 1, files.length),
          });
          requireTrust();
          const target = path.join(destination, file.relative);
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, file.content, { flag: 'wx' });
          copiedFiles++;
          progress.report({ increment: 50 / files.length });
        }
        if (files.length === 0) {
          progress.report({ increment: 50 });
        }
        progress.report({ message: localize('legacyMapperVerifying', 'Verifying converted files...'), increment: 10 });
        await verifyFiles(files, destination);
        await verifyFiles(files);
        await verifyLegacyFolders();
        if (newWorkspace) {
          const folders = (vscode.workspace.workspaceFolders ?? []).map((folder) => ({ name: folder.name, path: folder.uri.fsPath }));
          folders.push({ name: path.basename(destination), path: destination });
          await fs.writeFile(newWorkspace, JSON.stringify({ ...workspaceContents, folders }, null, 2), { flag: 'wx' });
          createdWorkspace = true;
        } else if (
          !vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length ?? 0, 0, {
            uri: vscode.Uri.file(destination),
            name: path.basename(destination),
          })
        ) {
          throw new Error(localize('legacyMapperAddProject', 'Could not add the converted mapper project to this workspace.'));
        }
        committed = true;
        progress.report({ message: localize('legacyMapperCleaning', 'Removing converted legacy mapper elements...'), increment: 15 });
        await verifyFiles(files);
        await verifyLegacyFolders();
        for (const file of metadata) {
          requireTrust();
          await vscode.workspace.fs.delete(vscode.Uri.file(file.source), { useTrash: true });
        }
        for (const folder of [hasDefinitions ? definitions : undefined, hasMapperAssets ? mapperAssets : undefined]) {
          if (folder) {
            requireTrust();
            await vscode.workspace.fs.delete(vscode.Uri.file(folder), { recursive: true, useTrash: true });
          }
        }
        return { destination, workspaceFile: newWorkspace };
      } catch (error) {
        if (!committed) {
          progress.report({ message: localize('legacyMapperRollingBack', 'Cleaning up the incomplete conversion...') });
          await fs.rm(destination, { recursive: true, force: true });
          if (createdWorkspace && newWorkspace) {
            await fs.unlink(newWorkspace);
          }
        }
        throw new Error(
          localize(
            'legacyMapperConversionFailed',
            'Legacy mapper conversion failed: {0}{1}',
            String(error),
            committed ? localize('legacyMapperCopiesPreserved', ' Converted files are preserved in {0}.', destination) : ''
          )
        );
      }
    },
  });
}

export function migrateLegacyDataMapperProjects(): Promise<boolean> {
  if (pendingMigration) {
    return pendingMigration;
  }
  pendingMigration = (async () => {
    if (!vscode.workspace.isTrusted || vscode.workspace.workspaceFolders?.some((folder) => folder.uri.scheme !== 'file')) {
      return false;
    }
    const scanned = new Set<string>();
    for (;;) {
      const projects = (await getWorkspaceLogicAppRoots()).filter((project) => !scanned.has(project));
      if (projects.length === 0) {
        return false;
      }
      for (const project of projects) {
        scanned.add(project);
        if (await migrateProject(project)) {
          return true;
        }
      }
    }
  })().finally(() => {
    pendingMigration = undefined;
  });
  return pendingMigration;
}
