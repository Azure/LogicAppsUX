import { funcVersionSetting } from '../../../constants';
import { getWorkspaceSettingFromAnyFolder } from '../vsCodeConfig/settings';
import { tryGetLocalFuncVersion } from './tryGetLocalFuncVersion';
import { FuncVersion, isNullOrUndefined, latestGAVersion } from '@microsoft-logic-apps/utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export function tryParseFuncVersion(data: string | undefined): FuncVersion | undefined {
  if (data) {
    const majorVersion: string | undefined = tryGetMajorVersion(data);
    if (majorVersion) {
      return Object.values(FuncVersion).find((version) => version === '~' + majorVersion);
    }
  }

  return undefined;
}

function tryGetMajorVersion(data: string): string | undefined {
  const match: RegExpMatchArray | null = data.match(/^[~v]?([0-9]+)/i);
  return match ? match[1] : undefined;
}

/* eslint-disable no-param-reassign */
export async function getDefaultFuncVersion(context: IActionContext): Promise<FuncVersion> {
  // Try to get VS Code setting for version (aka if they have a project open)
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
