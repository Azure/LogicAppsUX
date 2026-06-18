/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fse from 'fs-extra';
import { parseString } from 'xml2js';
import { getDotNetCommand } from './dotnet/dotnet';
import { executeCommand } from './funcCoreTools/cpUtils';
import { ext } from '../../extensionVariables';

const SDK_PACKAGE_ID = 'Microsoft.Azure.Workflows.Sdk';
const SDK_PACKAGE_ID_LOWER = 'microsoft.azure.workflows.sdk';

export interface SdkResolutionResult {
  sdkNupkgPath: string;
  version: string;
}

/**
 * Resolves the SDK nupkg path dynamically from the user's project.
 * Parses the .csproj for the SDK PackageReference version, queries the NuGet
 * global packages cache, and constructs the path to the cached nupkg.
 *
 * @param projectPath - The root folder of the Logic App project (containing the .csproj)
 * @returns The resolved SDK nupkg path and version, or undefined if resolution fails
 */
export async function resolveSdkFromProject(projectPath: string): Promise<SdkResolutionResult | undefined> {
  try {
    const csprojPath = await findCsprojFile(projectPath);
    if (!csprojPath) {
      ext.outputChannel?.appendLog(`[SDK Resolution] No .csproj file found in ${projectPath}`);
      return undefined;
    }

    const sdkVersion = await parseSdkVersion(csprojPath);
    if (!sdkVersion) {
      ext.outputChannel?.appendLog(
        `[SDK Resolution] No ${SDK_PACKAGE_ID} PackageReference found in ${csprojPath}`
      );
      return undefined;
    }

    ext.outputChannel?.appendLog(`[SDK Resolution] Found SDK version ${sdkVersion} in ${csprojPath}`);

    const cacheRoot = await getNuGetGlobalPackagesPath();
    if (!cacheRoot) {
      ext.outputChannel?.appendLog('[SDK Resolution] Failed to determine NuGet global packages path');
      return undefined;
    }

    const nupkgPath = path.join(
      cacheRoot,
      SDK_PACKAGE_ID_LOWER,
      sdkVersion,
      `${SDK_PACKAGE_ID_LOWER}.${sdkVersion}.nupkg`
    );

    if (await fse.pathExists(nupkgPath)) {
      ext.outputChannel?.appendLog(`[SDK Resolution] Resolved SDK nupkg: ${nupkgPath}`);
      return { sdkNupkgPath: nupkgPath, version: sdkVersion };
    }

    // Fallback: check project-local .nuget/packages folder (for projects with globalPackagesFolder override)
    const localNupkgPath = path.join(
      projectPath,
      '.nuget',
      'packages',
      SDK_PACKAGE_ID_LOWER,
      sdkVersion,
      `${SDK_PACKAGE_ID_LOWER}.${sdkVersion}.nupkg`
    );

    if (await fse.pathExists(localNupkgPath)) {
      ext.outputChannel?.appendLog(`[SDK Resolution] Resolved SDK nupkg from project-local cache: ${localNupkgPath}`);
      return { sdkNupkgPath: localNupkgPath, version: sdkVersion };
    }

    ext.outputChannel?.appendLog(
      `[SDK Resolution] SDK package not found at ${nupkgPath} or ${localNupkgPath}. ` +
        `Ensure 'dotnet restore' has been run on the project.`
    );
    return undefined;
  } catch (error) {
    ext.outputChannel?.appendLog(`[SDK Resolution] Unexpected error: ${error}`);
    return undefined;
  }
}

/**
 * Finds the first .csproj file in the given directory.
 */
async function findCsprojFile(folderPath: string): Promise<string | undefined> {
  try {
    const files = await fse.readdir(folderPath);
    const csprojFile = files.find((file) => file.endsWith('.csproj'));
    return csprojFile ? path.join(folderPath, csprojFile) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parses the .csproj file to extract the Microsoft.Azure.Workflows.Sdk version
 * using xml2js for robust XML handling.
 */
async function parseSdkVersion(csprojPath: string): Promise<string | undefined> {
  try {
    const content = await fse.readFile(csprojPath, 'utf-8');
    const result = await parseCsprojXml(content);
    if (!result) {
      return undefined;
    }

    const itemGroups: any[] = result.Project?.ItemGroup ?? [];
    for (const group of itemGroups) {
      const packageRefs: any[] = group.PackageReference ?? [];
      for (const ref of packageRefs) {
        const include = ref.$?.Include;
        if (include?.toLowerCase() === SDK_PACKAGE_ID.toLowerCase()) {
          const version = ref.$.Version?.trim();
          if (!version) {
            continue;
          }
          if (version.startsWith('$(') || version.startsWith('@(')) {
            ext.outputChannel?.appendLog(
              `[SDK Resolution] SDK version is an MSBuild variable (${version}), cannot resolve statically`
            );
            return undefined;
          }
          return version;
        }
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function parseCsprojXml(content: string): Promise<any | undefined> {
  return new Promise((resolve) => {
    parseString(content, (err, result) => {
      resolve(err ? undefined : result);
    });
  });
}

/**
 * Queries the NuGet global packages cache root path using the dotnet CLI.
 * Uses the configured dotnet binary path (respects azureLogicAppsStandard.dotnetBinaryPath setting).
 *
 * Output format: "global-packages: C:\Users\user\.nuget\packages\"
 */
async function getNuGetGlobalPackagesPath(): Promise<string | undefined> {
  try {
    const dotnetCommand = getDotNetCommand();
    const output = await executeCommand(ext.outputChannel, undefined, dotnetCommand, 'nuget', 'locals', 'global-packages', '--list');

    if (!output) {
      return undefined;
    }

    // Parse output: "global-packages: /path/to/packages/"
    const prefix = 'global-packages:';
    const line = output.split('\n').find((l) => l.trim().toLowerCase().startsWith(prefix.toLowerCase()));
    if (!line) {
      ext.outputChannel?.appendLog(`[SDK Resolution] Unexpected dotnet nuget locals output: ${output}`);
      return undefined;
    }

    const cachePath = line.substring(line.indexOf(':') + 1).trim();
    if (!cachePath || !(await fse.pathExists(cachePath))) {
      ext.outputChannel?.appendLog(`[SDK Resolution] NuGet cache path does not exist: ${cachePath}`);
      return undefined;
    }

    return cachePath;
  } catch (error) {
    ext.outputChannel?.appendLog(`[SDK Resolution] Failed to query NuGet cache path: ${error}`);
    return getDefaultNuGetCachePath();
  }
}

/**
 * Fallback: returns the default NuGet cache path for the current OS.
 * Used only if 'dotnet nuget locals' fails.
 */
async function getDefaultNuGetCachePath(): Promise<string | undefined> {
  // Check NUGET_PACKAGES environment variable first
  const envPath = process.env.NUGET_PACKAGES;
  if (envPath && (await fse.pathExists(envPath))) {
    return envPath;
  }

  // Default path by OS
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) {
    return undefined;
  }

  const defaultPath = path.join(home, '.nuget', 'packages');
  if (await fse.pathExists(defaultPath)) {
    return defaultPath;
  }

  return undefined;
}
