import { funcVersionSetting } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { getWorkspaceSettingFromAnyFolder } from '../vsCodeConfig/settings';
import { executeCommand } from './cpUtils';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { FuncVersion, latestGAVersion } from '@microsoft/vscode-extension';
import * as semver from 'semver';

/**
 * Parses functions core tools version.
 * @param {string | undefined} data - Functions core tools package version.
 * @returns {FuncVersion | undefined} Parsed functions core tools version.
 */
export function tryParseFuncVersion(data: string | undefined): FuncVersion | undefined {
  if (data) {
    const majorVersion: string | undefined = tryGetMajorVersion(data);
    if (majorVersion) {
      return Object.values(FuncVersion).find((version) => version === '~' + majorVersion);
    }
  }

  return undefined;
}

/**
 * Gets major version of package.
 * @param {string} data - Package version.
 * @returns {string | undefined} Major version.
 */
function tryGetMajorVersion(data: string): string | undefined {
  const match: RegExpMatchArray | null = data.match(/^[~v]?([0-9]+)/i);
  return match ? match[1] : undefined;
}

/**
 * Gets default functions core tools version either from open workspace, local cli or backup.
 * @param {string} context - Command context.
 * @returns {Promise<FuncVersion>} Major version.
 */
/* eslint-disable no-param-reassign */
export async function getDefaultFuncVersion(context: IActionContext): Promise<FuncVersion> {
  let version: FuncVersion | undefined = tryParseFuncVersion(getWorkspaceSettingFromAnyFolder(funcVersionSetting));
  context.telemetry.properties.runtimeSource = 'VSCodeSetting';

  if (isNullOrUndefined(version)) {
    version = await tryGetLocalFuncVersion();
    context.telemetry.properties.runtimeSource = 'LocalFuncCli';
  }

  if (isNullOrUndefined(version)) {
    version = latestGAVersion;
    context.telemetry.properties.runtimeSource = 'Backup';
  }

  return version;
}
/* eslint-enable no-param-reassign */

/**
 * Gets functions core tools version from local cli command.
 * @returns {Promise<FuncVersion | undefined>} Functions core tools version.
 */
async function tryGetLocalFuncVersion(): Promise<FuncVersion | undefined> {
  try {
    const version: string | null = await getLocalFuncCoreToolsVersion();
    if (version) {
      return tryParseFuncVersion(version);
    }
  } catch (err) {
    // swallow errors and return undefined
  }

  return undefined;
}

/**
 * Executes version command and gets it from cli.
 * @returns {Promise<string | null>} Functions core tools version.
 */
async function getLocalFuncCoreToolsVersion(): Promise<string | null> {
  const output: string = await executeCommand(undefined, undefined, ext.funcCliPath, '--version');
  const version: string | null = semver.clean(output);
  if (version) {
    return version;
  } else {
    // Old versions of the func cli do not support '--version', so we have to parse the command usage to get the version
    const matchResult: RegExpMatchArray | null = output.match(/(?:.*)Azure Functions Core Tools (.*)/);
    if (matchResult !== null) {
      let localVersion: string = matchResult[1].replace(/[()]/g, '').trim(); // remove () and whitespace
      // this is a fix for a bug currently in the Function CLI
      if (localVersion === '220.0.0-beta.0') {
        localVersion = '2.0.1-beta.25';
      }
      return semver.valid(localVersion);
    }

    return null;
  }
}
