/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import * as path from 'node:path';
import * as semver from 'semver';

const bundleId = 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';

export interface ExperimentalBundleSelection {
  directory: string;
  folderVersion: string;
  manifestVersion: string;
}

export interface ExperimentalBundleRuntime extends ExperimentalBundleSelection {
  env: Record<string, string>;
}

export function isBundleVersion(version: string): boolean {
  return (
    semver.valid(version) === version ||
    (/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){3}$/.test(version) && version.split('.').every((part) => Number(part) <= 2147483647))
  );
}

export async function readExperimentalBundleSelection(directory: string): Promise<ExperimentalBundleSelection> {
  const folderVersion = path.basename(directory);
  if (!isBundleVersion(folderVersion)) {
    throw new Error('The selected experimental bundle folder must have a valid three- or four-part version.');
  }
  try {
    const manifest: unknown = JSON.parse(await readFile(path.join(directory, 'bundle.json'), 'utf8'));
    if (
      typeof manifest !== 'object' ||
      manifest === null ||
      !('id' in manifest) ||
      manifest.id !== bundleId ||
      !('version' in manifest) ||
      typeof manifest.version !== 'string' ||
      !isBundleVersion(manifest.version)
    ) {
      throw new Error('Invalid bundle identity.');
    }
    for (const file of ['extensions.json', 'Microsoft.Azure.Workflows.Data.Edge.dll']) {
      const info = await stat(path.join(directory, 'bin', file));
      if (!info.isFile() || info.size === 0) {
        throw new Error('Missing runtime files.');
      }
    }
    return { directory: path.resolve(directory), folderVersion, manifestVersion: manifest.version };
  } catch {
    throw new Error(
      'The selected experimental Logic Apps bundle is missing or invalid. Install a complete bundle with bundle.json and runtime binaries, or disable experimental bundles. No public bundle will be substituted.'
    );
  }
}

/**
 * Core Tools can force ensureLatest even for a cached bundle. A local metadata-only
 * source constrains that lookup to the selected cache folder, without serving files
 * or allowing the host to download a different bundle.
 */
export class ExperimentalBundleSource {
  private server: Server | undefined;
  private listening: Promise<number> | undefined;
  private generation = 0;
  private readonly selections = new Map<string, ExperimentalBundleSelection>();

  async resolve(directory: string): Promise<ExperimentalBundleRuntime> {
    const generation = this.generation;
    const selection = await readExperimentalBundleSelection(directory);
    if (generation !== this.generation) {
      throw new Error('The experimental bundle metadata source was disposed before host launch. Reopen the designer after reload.');
    }
    const port = await this.listen();
    if (generation !== this.generation) {
      throw new Error('The experimental bundle metadata source was disposed before host launch. Reopen the designer after reload.');
    }
    let token = [...this.selections].find(
      ([, current]) => current.directory === selection.directory && current.manifestVersion === selection.manifestVersion
    )?.[0];
    if (!token) {
      token = randomUUID();
      this.selections.set(token, selection);
    }
    return {
      ...selection,
      env: {
        FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: `http://127.0.0.1:${port}/${token}`,
        AzureFunctionsJobHost__extensionBundle__id: bundleId,
        AzureFunctionsJobHost__extensionBundle__version: `[${selection.folderVersion}]`,
        AzureFunctionsJobHost__extensionBundle__downloadPath: path.dirname(selection.directory),
      },
    };
  }

  private listen(): Promise<number> {
    if (this.listening) {
      return this.listening;
    }
    this.listening = new Promise((resolve, reject) => {
      const generation = this.generation;
      const server = createServer(async (request, response) => {
        response.setHeader('Cache-Control', 'no-store');
        const match = /^\/([^/]+)\/ExtensionBundles\/Microsoft\.Azure\.Functions\.ExtensionBundle\.Workflows\/index\.json$/.exec(
          request.url ?? ''
        );
        const selection = match && this.selections.get(match[1]);
        if (request.method !== 'GET' || !selection) {
          response.writeHead(404).end();
          return;
        }
        try {
          const current = await readExperimentalBundleSelection(selection.directory);
          if (current.manifestVersion !== selection.manifestVersion) {
            throw new Error('Selected bundle identity changed.');
          }
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify([selection.folderVersion]));
        } catch {
          response.writeHead(410).end('Selected experimental bundle is no longer available.');
        }
      });
      this.server = server;
      server.once('error', () => {
        this.listening = undefined;
        reject(new Error('Could not start the local experimental bundle metadata source. The Functions host was not launched.'));
      });
      server.listen(0, '127.0.0.1', () => {
        if (generation !== this.generation) {
          server.close();
          reject(new Error('The experimental bundle metadata source was disposed before host launch.'));
          return;
        }
        const address = server.address();
        if (!address || typeof address === 'string') {
          reject(new Error('The experimental bundle metadata source has no listening port.'));
          return;
        }
        server.unref();
        resolve(address.port);
      });
    });
    return this.listening;
  }

  dispose(): void {
    this.generation++;
    this.server?.closeAllConnections();
    this.server?.close();
    this.server = undefined;
    this.listening = undefined;
    this.selections.clear();
  }
}
