import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { readTextFileSync } from '../schema/schemaFileResolver';
import { getLmlSchemaDependencies } from './lmlImportPlanner';

export interface LmlRuntimeWorkspace {
  projectPath: string;
  runtimePath: string;
}

async function containedPath(root: string, relativePath: string): Promise<string> {
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('LML runtime paths must remain inside the project.');
  }
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stat = await fs.lstat(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return undefined;
    });
    if (stat?.isSymbolicLink() || (stat?.isFile() && stat.nlink > 1)) {
      throw new Error('LML runtime does not stage through linked files or directories.');
    }
  }
  return target;
}

export async function prepareLmlRuntimeWorkspace(projectPath: string, schemaPaths: string[] = []): Promise<LmlRuntimeWorkspace> {
  const root = await fs.realpath(projectPath);
  if (!(await fs.stat(root)).isDirectory()) {
    throw new Error('Select an existing mapper project directory.');
  }
  const schemasRoot = await containedPath(root, 'Schemas');
  const schemaFiles = new Map<string, Buffer>();
  async function collectSchema(reference: string): Promise<void> {
    const normalized = reference.replace(/\\/g, path.sep);
    if (path.isAbsolute(normalized) || /^[a-z][a-z0-9+.-]*:/i.test(normalized) || !/\.(xsd|xml|json)$/i.test(normalized)) {
      throw new Error('LML runtime schemas must be local files inside Schemas.');
    }
    const source = await containedPath(schemasRoot, normalized);
    const relative = path.relative(schemasRoot, source);
    if (schemaFiles.has(relative)) {
      return;
    }
    const data = await fs.readFile(source);
    schemaFiles.set(relative, data);
    for (const dependency of getLmlSchemaDependencies(source, readTextFileSync(source) ?? '')) {
      await collectSchema(path.join(path.dirname(relative), dependency));
    }
  }
  for (const reference of schemaPaths) {
    await collectSchema(reference);
  }
  const runtimePath = await containedPath(root, 'workflow-designtime');
  await fs.mkdir(runtimePath, { recursive: true });
  await fs
    .writeFile(await containedPath(root, 'workflow-designtime/.gitignore'), '*\n', { flag: 'wx' })
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    });
  const defaults = {
    'host.json': {
      version: '2.0',
      extensionBundle: { id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows', version: '[1.*, 2.0.0)' },
      extensions: { workflow: { settings: { 'Runtime.WorkflowOperationDiscoveryHostMode': 'true' } } },
    },
    'local.settings.json': {
      IsEncrypted: false,
      Values: {
        APP_KIND: 'workflowapp',
        ProjectDirectoryPath: runtimePath,
        FUNCTIONS_WORKER_RUNTIME: 'dotnet',
        FUNCTIONS_INPROC_NET8_ENABLED: '1',
        AzureWebJobsSecretStorageType: 'Files',
      },
    },
  };
  for (const [name, content] of Object.entries(defaults)) {
    const target = await containedPath(root, path.join('workflow-designtime', name));
    await fs.writeFile(target, JSON.stringify(content, null, 2), { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    });
  }
  async function stage(sourceRelative: string, targetRelative: string, accepts: (name: string) => boolean): Promise<void> {
    const source = await containedPath(root, sourceRelative);
    const entries = await fs.readdir(source, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return [];
    });
    for (const entry of entries) {
      const sourceFile = path.join(sourceRelative, entry.name);
      await containedPath(root, sourceFile);
      if (entry.isDirectory()) {
        await stage(sourceFile, path.join(targetRelative, entry.name), accepts);
      } else if (entry.isFile() && accepts(entry.name)) {
        const target = await containedPath(root, path.join(targetRelative, entry.name));
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(path.join(root, sourceFile), target);
      }
    }
  }
  for (const folder of ['Schemas', 'Maps']) {
    await fs.mkdir(await containedPath(runtimePath, path.join('Artifacts', folder)), { recursive: true });
  }
  const runtimeSchemas = path.join('workflow-designtime', 'Artifacts', 'Schemas');
  async function pruneSchemas(relative = ''): Promise<void> {
    const directory = await containedPath(root, path.join(runtimeSchemas, relative));
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const child = path.join(relative, entry.name);
      const target = await containedPath(root, path.join(runtimeSchemas, child));
      if (entry.isDirectory()) {
        await pruneSchemas(child);
        if ((await fs.readdir(target)).length === 0) {
          await fs.rmdir(target);
        }
      } else if (entry.isFile() && !schemaFiles.has(child)) {
        await fs.unlink(target);
      }
    }
  }
  await pruneSchemas();
  for (const [relative, data] of schemaFiles) {
    const target = await containedPath(root, path.join(runtimeSchemas, relative));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
  }
  await fs.rm(await containedPath(root, 'workflow-designtime/Artifacts/MapDefinitions'), { recursive: true, force: true });
  await stage('__generated', 'workflow-designtime/Artifacts/Maps', (name) => name.toLowerCase().endsWith('.lml.xslt'));
  await stage('Artifacts/DataMapper/Extensions/InlineXslt', 'workflow-designtime/Artifacts/DataMapper/Extensions/InlineXslt', (name) =>
    /\.(xslt|xml)$/i.test(name)
  );
  return { projectPath: root, runtimePath };
}
