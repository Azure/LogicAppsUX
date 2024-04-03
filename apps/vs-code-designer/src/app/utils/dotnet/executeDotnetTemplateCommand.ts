/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { useBinariesDependencies } from '../binaries';
import { executeCommand, wrapArgInQuotes } from '../funcCoreTools/cpUtils';
import { getDotNetCommand, getLocalDotNetVersionFromBinaries } from './dotnet';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import type { SemVer } from 'semver';
import { coerce as semVerCoerce } from 'semver';

let cachedFramework: string | undefined;

/**
 * Executes dotnet command in command line.
 * @param {IActionContext} context - Command context.
 * @param {FuncVersion} version - Functions core tools version.
 * @param {string} projTemplateKey - Template key.
 * @param {string | undefined} workingDirectory - Workspace path.
 * @param {string} operation - Operation argument for command.
 * @param {string[]} args - Rest of arguments for command.
 * @returns {Promise<string>} Command result.
 */
export async function executeDotnetTemplateCommand(
  context: IActionContext,
  version: FuncVersion,
  projTemplateKey: string,
  workingDirectory: string | undefined,
  operation: 'list' | 'create',
  ...args: string[]
): Promise<string> {
  const framework: string = await getFramework(context, workingDirectory);
  const jsonDllPath: string = ext.context.asAbsolutePath(
    path.join('assets', 'dotnetJsonCli', framework, 'Microsoft.TemplateEngine.JsonCli.dll')
  );

  return await executeCommand(
    undefined,
    workingDirectory,
    getDotNetCommand(),
    wrapArgInQuotes(jsonDllPath),
    '--templateDir',
    wrapArgInQuotes(getDotnetTemplateDir(version, projTemplateKey)),
    '--operation',
    operation,
    ...args
  );
}

export function getDotnetItemTemplatePath(version: FuncVersion, projTemplateKey: string): string {
  return path.join(getDotnetTemplateDir(version, projTemplateKey), 'item.nupkg');
}

export function getDotnetProjectTemplatePath(version: FuncVersion, projTemplateKey: string): string {
  return path.join(getDotnetTemplateDir(version, projTemplateKey), 'project.nupkg');
}

/**
 * Gets dotnet template directory.
 * @param {FuncVersion} version - Functions core tools version.
 * @param {string} projTemplateKey - Template key.
 * @returns {string} Template directory.
 */
export function getDotnetTemplateDir(version: FuncVersion, projTemplateKey: string): string {
  return path.join(ext.context.globalStorageUri.fsPath, version, projTemplateKey);
}

/**
 * Validates .NET is installed.
 * @param {IActionContext} context - Command context.
 */
export async function validateDotnetInstalled(context: IActionContext): Promise<void> {
  // NOTE: Doesn't feel obvious that `getFramework` would validate dotnet is installed, hence creating a separate function named `validateDotnetInstalled` to export from this file
  await getFramework(context, undefined);
}

/**
 * Gets .NET framework version.
 * @param {IActionContext} context - Command context.
 * @param {string | undefined} workingDirectory - Workspace path.
 * @returns {Promise<string>} .NET version.
 */
export async function getFramework(context: IActionContext, workingDirectory: string | undefined): Promise<string> {
  if (!cachedFramework) {
    let versions = '';
    const dotnetBinariesLocation = getDotNetCommand();

    versions = useBinariesDependencies() ? await getLocalDotNetVersionFromBinaries() : versions;

    try {
      versions += await executeCommand(undefined, workingDirectory, dotnetBinariesLocation, '--version');
    } catch {
      // ignore
    }

    try {
      versions += await executeCommand(undefined, workingDirectory, dotnetBinariesLocation, '--list-sdks');
    } catch {
      // ignore
    }

    // Prioritize "LTS", then "Current", then "Preview"
    const netVersions: string[] = ['6', '3', '2'];
    const semVersions: SemVer[] = netVersions.map((v) => semVerCoerce(v) as SemVer);

    let pickedVersion: SemVer | undefined;

    // Try to get a GA version first (i.e. "1.0.0")
    for (const semVersion of semVersions) {
      const regExp = new RegExp(`^\\s*${semVersion.major}\\.${semVersion.minor}\\.[0-9]+(\\s|$)`, 'm');
      if (regExp.test(versions)) {
        pickedVersion = semVersion;
        break;
      }
    }

    // Otherwise allow a preview version (i.e. "1.0.0-alpha")
    if (!pickedVersion) {
      for (const semVersion of semVersions) {
        const regExp = new RegExp(`^\\s*${semVersion.major}\\.${semVersion.minor}\\.`, 'm');
        if (regExp.test(versions)) {
          pickedVersion = semVersion;
          break;
        }
      }
    }

    if (!pickedVersion) {
      context.errorHandling.suppressReportIssue = true;
      throw new Error(
        localize(
          'noMatchingFramework',
          'You must have the [.NET Core SDK](https://aka.ms/AA4ac70) installed to perform this operation. See [here](https://aka.ms/AA1tpij) for supported versions.'
        )
      );
    } else {
      cachedFramework = `${pickedVersion.major < 4 ? 'netcoreapp' : 'net'}${pickedVersion.major}.${pickedVersion.minor}`;
    }
  }

  return cachedFramework;
}
