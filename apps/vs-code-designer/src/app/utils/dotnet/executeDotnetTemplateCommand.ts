/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { executeCommand } from '../funcCoreTools/cpUtils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { SemVer } from 'semver';
import { coerce as semVerCoerce } from 'semver';

let cachedFramework: string | undefined;

export async function validateDotnetInstalled(context: IActionContext): Promise<void> {
  // NOTE: Doesn't feel obvious that `getFramework` would validate dotnet is installed, hence creating a separate function named `validateDotnetInstalled` to export from this file
  await getFramework(context, undefined);
}

export async function getFramework(context: IActionContext, workingDirectory: string | undefined): Promise<string> {
  if (!cachedFramework) {
    let versions = '';
    try {
      versions += await executeCommand(undefined, workingDirectory, 'dotnet', '--version');
    } catch {
      // ignore
    }

    try {
      versions += await executeCommand(undefined, workingDirectory, 'dotnet', '--list-sdks');
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
