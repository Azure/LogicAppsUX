/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import path from 'path';
import * as fse from 'fs-extra';
import { CodefulSdk } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { getDotNetCommand } from './dotnet/dotnet';
import { executeCommand, wrapArgInQuotes } from './funcCoreTools/cpUtils';

const sdkPackageIdLower = CodefulSdk.WorkflowsSDK.toLowerCase();

interface PackageListReport {
  projects?: {
    frameworks?: {
      topLevelPackages?: {
        id?: string;
        resolvedVersion?: string;
      }[];
    }[];
  }[];
}

interface ProjectAssets {
  packageFolders?: Record<string, unknown>;
}

export interface SdkResolutionResult {
  sdkNupkgPath: string;
  version: string;
}

/**
 * Resolves the concrete Logic Apps SDK package selected by the latest NuGet restore.
 * This does not restore the project or access package feeds.
 */
export async function resolveSdkFromProject(projectPath: string): Promise<SdkResolutionResult | undefined> {
  try {
    const csprojPath = await findCsprojFile(projectPath);
    if (!csprojPath) {
      ext.outputChannel.appendLog(localize('csprojFileNotFound', '[SDK Resolution] No .csproj file found in "{0}".', projectPath));
      return undefined;
    }

    const resolvedVersion = await getResolvedSdkVersion(projectPath, csprojPath);
    if (!resolvedVersion) {
      ext.outputChannel.appendLog(
        localize(
          'sdkVersionNotFound',
          '[SDK Resolution] No restored "{0}" PackageReference was found in "{1}".',
          CodefulSdk.WorkflowsSDK,
          csprojPath
        )
      );
      return undefined;
    }

    const assetsFilePath = await getProjectAssetsFilePath(projectPath, csprojPath);
    if (!assetsFilePath || !(await fse.pathExists(assetsFilePath))) {
      ext.outputChannel.appendLog(
        localize('projectAssetsNotFound', '[SDK Resolution] Project assets file was not found. Restore project "{0}".', csprojPath)
      );
      return undefined;
    }

    const assets = (await fse.readJson(assetsFilePath)) as ProjectAssets;
    const packageFolders = Object.keys(assets.packageFolders ?? {});
    const sdkNupkgPath = await findSdkNupkg(packageFolders, resolvedVersion);
    if (sdkNupkgPath) {
      ext.outputChannel.appendLog(localize('sdkNupkgFound', '[SDK Resolution] Resolved SDK nupkg: "{0}".', sdkNupkgPath));
      return { sdkNupkgPath, version: resolvedVersion };
    }

    ext.outputChannel.appendLog(
      localize(
        'sdkNupkgNotFound',
        '[SDK Resolution] SDK package was not found for resolved version "{0}". Restore project "{1}".',
        resolvedVersion,
        csprojPath
      )
    );
    return undefined;
  } catch (error) {
    ext.outputChannel.appendLog(
      localize(
        'sdkResolutionError',
        '[SDK Resolution] Unexpected error occurred: {0}',
        error instanceof Error ? error.message : String(error)
      )
    );
    return undefined;
  }
}

export async function restoreSdkForProject(projectPath: string): Promise<void> {
  const csprojPath = await findCsprojFile(projectPath);
  if (!csprojPath) {
    throw new Error(localize('csprojFileNotFound', 'No .csproj file found in "{0}".', projectPath));
  }

  await executeCommand(
    ext.outputChannel,
    projectPath,
    wrapArgInQuotes(getDotNetCommand()),
    'restore',
    wrapArgInQuotes(csprojPath),
    '--interactive'
  );
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

async function getResolvedSdkVersion(projectPath: string, csprojPath: string): Promise<string | undefined> {
  const output = await executeCommand(
    ext.outputChannel,
    projectPath,
    wrapArgInQuotes(getDotNetCommand()),
    'list',
    wrapArgInQuotes(csprojPath),
    'package',
    '--format',
    'json',
    '--output-version',
    '1',
    '--no-restore'
  );
  const report = JSON.parse(output) as PackageListReport;
  const versions = new Set<string>();

  for (const project of report.projects ?? []) {
    for (const framework of project.frameworks ?? []) {
      for (const packageReference of framework.topLevelPackages ?? []) {
        if (packageReference.id?.toLowerCase() === sdkPackageIdLower && packageReference.resolvedVersion) {
          versions.add(packageReference.resolvedVersion);
        }
      }
    }
  }

  if (versions.size === 1) {
    return [...versions][0];
  }

  if (versions.size > 1) {
    ext.outputChannel.appendLog(
      localize(
        'sdkVersionAmbiguous',
        '[SDK Resolution] Package "{0}" resolves to multiple versions across target frameworks: {1}.',
        CodefulSdk.WorkflowsSDK,
        [...versions].join(', ')
      )
    );
  }
  return undefined;
}

async function getProjectAssetsFilePath(projectPath: string, csprojPath: string): Promise<string | undefined> {
  const output = await executeCommand(
    ext.outputChannel,
    projectPath,
    wrapArgInQuotes(getDotNetCommand()),
    'msbuild',
    wrapArgInQuotes(csprojPath),
    '-getProperty:ProjectAssetsFile',
    '-nologo'
  );
  const assetsFilePath = output.trim();
  if (!assetsFilePath) {
    return undefined;
  }
  return path.isAbsolute(assetsFilePath) ? path.normalize(assetsFilePath) : path.resolve(projectPath, assetsFilePath);
}

async function findSdkNupkg(packageFolders: string[], version: string): Promise<string | undefined> {
  const normalizedVersion = version.toLowerCase();
  for (const packageFolder of packageFolders) {
    const nupkgPath = path.join(packageFolder, sdkPackageIdLower, normalizedVersion, `${sdkPackageIdLower}.${normalizedVersion}.nupkg`);
    if (await fse.pathExists(nupkgPath)) {
      return nupkgPath;
    }
  }
  return undefined;
}
