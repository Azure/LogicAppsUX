import * as fs from 'node:fs/promises';
import * as https from 'node:https';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { PublishContext, PublishDestination, PublishTarget } from './protocol/publishProtocol';
import type { PlannedSchemaFile } from './schema/mapImportPlanner';

const armBase = 'https://management.azure.com';

function requireTrust(): void {
  if (!vscode.workspace.isTrusted) {
    throw new Error('Trust this workspace before publishing a data map.');
  }
}

async function localProjects(): Promise<PublishDestination[]> {
  const hosts = await vscode.workspace.findFiles('**/host.json', '**/{node_modules,bin,obj,workflow-designtime,.git,dist,build,out}/**');
  const projects: PublishDestination[] = [];
  for (const host of hosts) {
    if (host.scheme !== 'file') {
      continue;
    }
    const root = path.dirname(host.fsPath);
    try {
      const settings = JSON.parse(await fs.readFile(host.fsPath, 'utf8'));
      let isLogicApp = settings.extensionBundle?.id === 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';
      if (!isLogicApp) {
        for (const entry of await fs.readdir(root)) {
          if (
            entry.toLowerCase().endsWith('.csproj') &&
            /Microsoft\.Azure\.(?:Workflows|Functions\.Worker\.Extensions\.Workflows)/i.test(
              await fs.readFile(path.join(root, entry), 'utf8')
            )
          ) {
            isLogicApp = true;
            break;
          }
        }
      }
      if (isLogicApp) {
        const uri = vscode.Uri.file(root);
        const id = uri.toString();
        if (!projects.some((project) => project.id === id)) {
          projects.push({
            id,
            name: path.basename(root),
            description: vscode.workspace.asRelativePath(uri, true),
            artifactsPath: path.join(root, 'Artifacts'),
          });
        }
      }
    } catch (error) {
      console.warn('Unable to inspect Logic App project for publishing:', root, error);
    }
  }
  return projects.sort((first, second) => first.name.localeCompare(second.name));
}

export async function getPublishContext(document: vscode.TextDocument): Promise<PublishContext> {
  requireTrust();
  return {
    mapName: path.basename(document.uri.fsPath),
    projectName: path.basename(path.dirname(document.uri.fsPath)),
    workspaceName: vscode.workspace.name ?? vscode.workspace.getWorkspaceFolder(document.uri)?.name ?? 'Local Workspace',
    localProjects: await localProjects(),
  };
}

class AzurePublishingError extends Error {
  constructor(readonly statusCode: number | undefined) {
    super(`Azure publishing request failed (${statusCode ?? 'unknown status'}).`);
  }
}

async function armRequest(
  url: string,
  method = 'GET',
  body?: string | Buffer,
  conditions: { ifMatch?: string; ifNoneMatch?: string } = {}
): Promise<string> {
  requireTrust();
  const endpoint = new URL(url);
  if (endpoint.origin !== armBase) {
    throw new Error('Publishing requires an Azure Resource Manager endpoint.');
  }
  const session = await vscode.authentication.getSession('microsoft', [`${armBase}/.default`], { createIfNone: true });
  requireTrust();
  return new Promise((resolve, reject) => {
    const request = https.request(
      endpoint,
      {
        method,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': body === undefined ? 'application/json' : 'application/octet-stream',
          ...(body === undefined ? {} : { 'Content-Length': Buffer.byteLength(body) }),
          ...(conditions.ifMatch ? { 'If-Match': conditions.ifMatch } : {}),
          ...(conditions.ifNoneMatch ? { 'If-None-Match': conditions.ifNoneMatch } : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          const content = Buffer.concat(chunks).toString('utf8');
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve(content);
          } else {
            reject(new AzurePublishingError(response.statusCode));
          }
        });
      }
    );
    request.on('error', reject);
    request.setTimeout(45_000, () => request.destroy(new Error('Azure publishing request timed out.')));
    request.end(body);
  });
}

interface AzureResource {
  id: string;
  name: string;
  displayName?: string;
  subscriptionId?: string;
  kind?: string;
  location?: string;
}

async function azureResources(url: string): Promise<AzureResource[]> {
  const resources: AzureResource[] = [];
  let next: string | undefined = url;
  while (next) {
    const result: { value?: AzureResource[]; nextLink?: string } = JSON.parse(await armRequest(next));
    resources.push(...(result.value ?? []));
    next = result.nextLink;
  }
  return resources;
}

export async function selectAzurePublishTarget(): Promise<PublishDestination | undefined> {
  requireTrust();
  const subscriptions = await azureResources(`${armBase}/subscriptions?api-version=2022-12-01`);
  if (!subscriptions.length) {
    throw new Error('No Azure subscriptions were found.');
  }
  const subscription = await vscode.window.showQuickPick(
    subscriptions.map((item) => ({ label: item.displayName ?? item.name, description: item.subscriptionId, resource: item })),
    { title: 'Publish Data Map: Select Subscription', placeHolder: 'Select an Azure subscription' }
  );
  if (!subscription) {
    return undefined;
  }
  const apps = (
    await azureResources(
      `${armBase}/subscriptions/${encodeURIComponent(subscription.resource.subscriptionId ?? '')}/providers/Microsoft.Web/sites?api-version=2022-09-01`
    )
  ).filter((app) => app.kind?.toLowerCase().split(',').includes('workflowapp'));
  if (!apps.length) {
    throw new Error('No Logic Apps Standard resources were found in this subscription.');
  }
  const selected = await vscode.window.showQuickPick(
    apps.map((app) => ({ label: app.name, description: app.location, detail: app.id, resource: app })),
    { title: 'Publish Data Map: Select Logic App', placeHolder: 'Select a Logic Apps Standard resource' }
  );
  return selected ? { id: selected.resource.id, name: selected.resource.name, description: selected.resource.id } : undefined;
}

export async function listAzurePublishResources(query: unknown): Promise<PublishDestination[]> {
  requireTrust();
  if (!query || typeof query !== 'object' || !('level' in query)) {
    throw new Error('Select an Azure publishing resource type.');
  }
  if (query.level === 'subscriptions') {
    return (await azureResources(`${armBase}/subscriptions?api-version=2022-12-01`))
      .map((resource) => ({
        id: resource.subscriptionId ?? resource.id.split('/').pop() ?? '',
        name: resource.displayName ?? resource.name,
        description: `Subscription: ${resource.subscriptionId ?? resource.id}`,
      }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }
  if (
    !('subscriptionId' in query) ||
    typeof query.subscriptionId !== 'string' ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(query.subscriptionId)
  ) {
    throw new Error('Select a valid Azure subscription.');
  }
  const subscription = `${armBase}/subscriptions/${encodeURIComponent(query.subscriptionId)}`;
  if (query.level === 'resourceGroups') {
    return (await azureResources(`${subscription}/resourcegroups?api-version=2021-04-01`))
      .map((resource) => ({
        id: resource.name,
        name: resource.name,
        description: resource.location ?? '',
      }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }
  if (
    query.level !== 'logicApps' ||
    !('resourceGroup' in query) ||
    typeof query.resourceGroup !== 'string' ||
    !query.resourceGroup ||
    /[\\/\0?#]/.test(query.resourceGroup) ||
    ['.', '..'].includes(query.resourceGroup)
  ) {
    throw new Error('Select a valid resource group.');
  }
  const resources = await azureResources(
    `${subscription}/resourceGroups/${encodeURIComponent(query.resourceGroup)}/providers/Microsoft.Web/sites?api-version=2022-09-01`
  );
  return resources
    .filter((resource) => resource.kind?.toLowerCase().split(',').includes('workflowapp'))
    .map((resource) => ({
      id: resource.id,
      name: resource.name,
      description: resource.location ? `Standard - ${resource.location}` : 'Standard',
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function parsePublishTarget(value: unknown): PublishTarget {
  if (
    !value ||
    typeof value !== 'object' ||
    !('kind' in value) ||
    !('id' in value) ||
    (value.kind !== 'local' && value.kind !== 'azure') ||
    typeof value.id !== 'string' ||
    !value.id
  ) {
    throw new Error('Select a publishing destination.');
  }
  return { kind: value.kind, id: value.id };
}

async function localArtifact(root: string, relative: string): Promise<string> {
  if (path.isAbsolute(relative) || relative.split('/').some((segment) => segment === '..' || /[\\:\0]/.test(segment))) {
    throw new Error('Published artifacts must remain inside their project.');
  }
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    const stat = await fs.lstat(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return undefined;
    });
    if (stat?.isSymbolicLink() || (stat?.isFile() && stat.nlink > 1)) {
      throw new Error('Publishing cannot replace linked artifacts.');
    }
  }
  return current;
}

export async function publishMapArtifacts(
  document: vscode.TextDocument,
  xslt: string,
  target: PublishTarget,
  assemblyPaths: string[] = [],
  schemaFiles: PlannedSchemaFile[] = []
): Promise<boolean> {
  requireTrust();
  if (!xslt.trim()) {
    throw new Error('Compile the map successfully before publishing.');
  }
  const name = `${path.basename(document.uri.fsPath).replace(/\.btm$/i, '')}.xslt`;
  const mapRelative = `Artifacts/Maps/${name}`;
  const artifacts: { relative: string; content: Buffer }[] = [{ relative: mapRelative, content: Buffer.from(xslt, 'utf8') }];
  const sourceRoot = path.dirname(document.uri.fsPath);
  const generatedRelative = `__generated/${name}`;
  const generatedFile = await localArtifact(sourceRoot, generatedRelative);
  await fs.mkdir(path.dirname(generatedFile), { recursive: true });
  requireTrust();
  await localArtifact(sourceRoot, generatedRelative);
  await fs.writeFile(generatedFile, xslt, 'utf8');
  for (const assembly of new Set(assemblyPaths)) {
    artifacts.push({ relative: `lib/custom/net472/${path.basename(assembly)}`, content: await fs.readFile(assembly) });
  }
  for (const schema of schemaFiles) {
    artifacts.push({ relative: `Artifacts/Schemas/${schema.relativePath}`, content: schema.data });
  }
  if (target.kind === 'local') {
    const destination = (await localProjects()).find((project) => project.id === target.id);
    if (!destination) {
      throw new Error('The selected Logic Apps project is no longer available in this workspace.');
    }
    const root = vscode.Uri.parse(destination.id).fsPath;
    const files = [];
    let replacing = false;
    for (const artifact of artifacts) {
      const filename = await localArtifact(root, artifact.relative);
      const exists = await fs.stat(filename).then(
        () => true,
        (error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') {
            throw error;
          }
          return false;
        }
      );
      const isMap = artifact.relative === mapRelative;
      if (exists && !isMap) {
        continue;
      }
      if (exists && isMap) {
        replacing = true;
      }
      files.push({ ...artifact, filename, isMap, overwrite: exists && isMap });
    }
    if (
      replacing &&
      (await vscode.window.showWarningMessage(
        `${name} already exists in ${destination.name}/Artifacts/Maps. Overwrite it?`,
        { modal: true },
        'Overwrite'
      )) !== 'Overwrite'
    ) {
      return false;
    }
    for (const artifact of files) {
      requireTrust();
      await localArtifact(root, artifact.relative);
      await fs.mkdir(path.dirname(artifact.filename), { recursive: true });
      try {
        await fs.writeFile(artifact.filename, artifact.content, { flag: artifact.overwrite ? 'w' : 'wx' });
      } catch (error) {
        if (artifact.isMap || (error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
      }
    }
  } else {
    if (!/^\/subscriptions\/[^/?#\\]+\/resourceGroups\/[^/?#\\]+\/providers\/Microsoft\.Web\/sites\/[^/?#\\]+$/i.test(target.id)) {
      throw new Error('Select a valid Logic Apps Standard resource.');
    }
    const app: AzureResource = JSON.parse(await armRequest(`${armBase}${target.id}?api-version=2022-09-01`));
    if (!app.kind?.toLowerCase().split(',').includes('workflowapp')) {
      throw new Error('The selected Azure resource is not a Logic Apps Standard resource.');
    }
    const files = [];
    let replacing = false;
    for (const artifact of artifacts) {
      const relative = artifact.relative.split('/').map(encodeURIComponent).join('/');
      const url = `${armBase}${target.id}/extensions/api/vfs/site/wwwroot/${relative}?api-version=2016-08-01`;
      let exists = true;
      try {
        await armRequest(url);
      } catch (error) {
        if (!(error instanceof AzurePublishingError) || error.statusCode !== 404) {
          throw error;
        }
        exists = false;
      }
      const isMap = artifact.relative === mapRelative;
      if (exists && !isMap) {
        continue;
      }
      if (exists && isMap) {
        replacing = true;
      }
      files.push({ ...artifact, url, isMap, overwrite: exists && isMap });
    }
    if (
      replacing &&
      (await vscode.window.showWarningMessage(
        `${name} already exists in ${app.name}/Artifacts/Maps. Overwrite it?`,
        { modal: true },
        'Overwrite'
      )) !== 'Overwrite'
    ) {
      return false;
    }
    for (const artifact of files) {
      try {
        await armRequest(artifact.url, 'PUT', artifact.content, artifact.overwrite ? { ifMatch: '*' } : { ifNoneMatch: '*' });
      } catch (error) {
        if (artifact.isMap || !(error instanceof AzurePublishingError) || error.statusCode !== 412) {
          throw error;
        }
      }
    }
  }
  vscode.window.showInformationMessage(`Published ${name}.`);
  return true;
}
