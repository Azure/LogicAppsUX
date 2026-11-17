/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import path from 'path';
import * as fse from 'fs-extra';
import { parseString } from 'xml2js';
import { CodefulSdk } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { getDotNetCommand } from './dotnet/dotnet';
import { executeCommand } from './funcCoreTools/cpUtils';

const sdkPackageIdLower = CodefulSdk.WorkflowsSDK.toLowerCase();

export interface SdkResolutionResult {
  sdkNupkgPath: string;
  version: string;
}

/**
 * Resolves the Logic Apps SDK package referenced by a codeful project.
 * The project must have been restored so the nupkg exists in either the
 * configured global package cache or its project-local package cache.
 */
export async function resolveSdkFromProject(projectPath: string): Promise<SdkResolutionResult | undefined> {
  try {
    const csprojPath = await findCsprojFile(projectPath);
    if (!csprojPath) {
      ext.outputChannel.appendLog(localize('csprojFileNotFound', '[SDK Resolution] No .csproj file found in "{0}".', projectPath));
      return undefined;
    }

    const sdkVersion = await parseSdkVersion(csprojPath);
    if (!sdkVersion) {
      ext.outputChannel.appendLog(
        localize('sdkVersionNotFound', '[SDK Resolution] No resolvable "{0}" PackageReference found in "{1}".', CodefulSdk.WorkflowsSDK, csprojPath)
      );
      return undefined;
    }

    const globalCacheRoot = await getNuGetGlobalPackagesPath();
    const globalNupkgPath = globalCacheRoot ? getSdkNupkgPath(globalCacheRoot, sdkVersion) : undefined;
    if (globalNupkgPath && (await fse.pathExists(globalNupkgPath))) {
      ext.outputChannel.appendLog(localize('sdkNupkgFound', '[SDK Resolution] Resolved SDK nupkg: "{0}".', globalNupkgPath));
      return { sdkNupkgPath: globalNupkgPath, version: sdkVersion };
    }

    const localNupkgPath = getSdkNupkgPath(path.join(projectPath, '.nuget', 'packages'), sdkVersion);
    if (await fse.pathExists(localNupkgPath)) {
      ext.outputChannel.appendLog(localize('sdkNupkgFoundLocal', '[SDK Resolution] Resolved SDK nupkg from project-local cache: "{0}".', localNupkgPath));
      return { sdkNupkgPath: localNupkgPath, version: sdkVersion };
    }

    ext.outputChannel.appendLog(
      localize(
        'sdkNupkgNotFound',
        '[SDK Resolution] SDK package was not found for version "{0}". Ensure \'dotnet restore\' has been run on the project.',
        sdkVersion
      )
    );
    return undefined;
  } catch (error) {
    ext.outputChannel.appendLog(
      localize('sdkResolutionError', '[SDK Resolution] Unexpected error occurred: {0}', error instanceof Error ? error.message : String(error))
    );
    return undefined;
  }
}

async function findCsprojFile(folderPath: string): Promise<string | undefined> {
  try {
    const files = await fse.readdir(folderPath);
    const csprojFile = files.find((file) => file.endsWith('.csproj'));
    return csprojFile ? path.join(folderPath, csprojFile) : undefined;
  } catch {
    return undefined;
  }
}

async function parseSdkVersion(csprojPath: string): Promise<string | undefined> {
  try {
    const content = await fse.readFile(csprojPath, 'utf-8');
    const project = await parseCsprojXml(content);
    if (!project) {
      return undefined;
    }

    for (const group of project.Project?.ItemGroup ?? []) {
      for (const reference of group.PackageReference ?? []) {
        if (reference.$?.Include?.toLowerCase() !== sdkPackageIdLower) {
          continue;
        }

        const version = getXmlValue(reference.$?.VersionOverride ?? reference.$?.Version ?? reference.Version?.[0]);
        if (!version) {
          return undefined;
        }

        const propertyMatch = /^\$\(([^)]+)\)$/.exec(version);
        if (propertyMatch) {
          const resolvedVersion = getProjectProperty(project, propertyMatch[1]);
          if (!resolvedVersion) {
            ext.outputChannel.appendLog(
              localize('sdkVersionIsVariable', '[SDK Resolution] SDK version property "{0}" could not be resolved in the project file.', version)
            );
          }
          return resolvedVersion;
        }

        if (version.startsWith('@(')) {
          ext.outputChannel.appendLog(
            localize('sdkVersionIsVariable', '[SDK Resolution] SDK version item reference "{0}" cannot be resolved statically.', version)
          );
          return undefined;
        }

        return version;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function getProjectProperty(project: any, propertyName: string): string | undefined {
  for (const group of project.Project?.PropertyGroup ?? []) {
    const value = getXmlValue(group[propertyName]?.[0]);
    if (value && !value.startsWith('$(') && !value.startsWith('@(')) {
      return value;
    }
  }
  return undefined;
}

function getXmlValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (value && typeof value === 'object' && '_' in value && typeof value._ === 'string') {
    return value._.trim() || undefined;
  }
  return undefined;
}

function parseCsprojXml(content: string): Promise<any | undefined> {
  return new Promise((resolve) => {
    parseString(content, (error, result) => resolve(error ? undefined : result));
  });
}

async function getNuGetGlobalPackagesPath(): Promise<string | undefined> {
  try {
    const output = await executeCommand(ext.outputChannel, undefined, getDotNetCommand(), 'nuget', 'locals', 'global-packages', '--list');
    if (!output) {
      return undefined;
    }

    const prefix = 'global-packages:';
    const line = output.split(/\r?\n/).find((value) => value.trim().toLowerCase().startsWith(prefix));
    if (!line) {
      ext.outputChannel.appendLog(localize('sdkUnexpectedNuGetOutput', '[SDK Resolution] Unexpected dotnet nuget locals output: "{0}".', output));
      return undefined;
    }

    const cachePath = line.substring(line.indexOf(':') + 1).trim();
    if (!cachePath || !(await fse.pathExists(cachePath))) {
      return undefined;
    }
    return cachePath;
  } catch (error) {
    ext.outputChannel.appendLog(
      localize(
        'sdkResolutionError',
        '[SDK Resolution] Failed to query NuGet cache path: "{0}".',
        error instanceof Error ? error.message : String(error)
      )
    );
    return getDefaultNuGetCachePath();
  }
}

async function getDefaultNuGetCachePath(): Promise<string | undefined> {
  const configuredPath = process.env.NUGET_PACKAGES;
  if (configuredPath && (await fse.pathExists(configuredPath))) {
    return configuredPath;
  }

  const homeDirectory = process.env.USERPROFILE || process.env.HOME;
  if (!homeDirectory) {
    return undefined;
  }

  const defaultPath = path.join(homeDirectory, '.nuget', 'packages');
  return (await fse.pathExists(defaultPath)) ? defaultPath : undefined;
}

function getSdkNupkgPath(cacheRoot: string, version: string): string {
  return path.join(cacheRoot, sdkPackageIdLower, version, `${sdkPackageIdLower}.${version}.nupkg`);
}
