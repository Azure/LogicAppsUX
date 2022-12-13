import { localize } from '../../../localize';
import { ProjectFile } from '../../commands/initProjectForVSCode/DotnetInitVSCodeStep';
import { runWithDurationTelemetry } from '../telemetry';
import { findFiles } from '../workspace';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProjectLanguage } from '@microsoft/vscode-extension';
import path from 'path';

export async function getProjFiles(context: IActionContext, projectLanguage: ProjectLanguage, projectPath: string): Promise<ProjectFile[]> {
  return await runWithDurationTelemetry(context, 'getNetProjFiles', async () => {
    const pattern = projectLanguage === ProjectLanguage.FSharp ? '*.fsproj' : '*.csproj';
    const uris = await findFiles(projectPath, pattern);
    return uris
      .map((uri) => path.basename(uri.fsPath))
      .filter((f) => f.toLowerCase() !== 'extensions.csproj')
      .map((f) => new ProjectFile(f, projectPath));
  });
}

export async function getTargetFramework(projFile: ProjectFile): Promise<string> {
  return await getPropertyInProjFile(projFile, 'TargetFramework');
}

export function getDotnetDebugSubpath(targetFramework: string): string {
  return path.posix.join('bin', 'Debug', targetFramework);
}

export async function tryGetFuncVersion(projFile: ProjectFile): Promise<string | undefined> {
  try {
    return await getPropertyInProjFile(projFile, 'AzureFunctionsVersion');
  } catch {
    return undefined;
  }
}

async function getPropertyInProjFile(projFile: ProjectFile, prop: string): Promise<string> {
  const regExp = new RegExp(`<${prop}>(.*)<\\/${prop}>`);
  const matches: RegExpMatchArray | null = (await projFile.getContents()).match(regExp);
  if (!matches) {
    throw new Error(localize('failedToFindProp', 'Failed to find "{0}" in project file "{1}".', prop, projFile.name));
  } else {
    return matches[1];
  }
}
