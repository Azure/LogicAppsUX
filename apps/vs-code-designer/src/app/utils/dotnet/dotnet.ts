/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { runWithDurationTelemetry } from '../telemetry';
import { findFiles } from '../workspace';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzExtFsExtra } from '@microsoft/vscode-azext-utils';
import { ProjectLanguage } from '@microsoft/vscode-extension';
import path from 'path';

export class ProjectFile {
  public name: string;
  public fullPath: string;
  // We likely need to check a few things in quick succession, so we'll cache the contents here
  private _cachedContents: string | undefined;
  constructor(name: string, projectPath: string) {
    this.name = name;
    this.fullPath = path.join(projectPath, name);
  }

  public async getContents(): Promise<string> {
    if (this._cachedContents === undefined) {
      this._cachedContents = await AzExtFsExtra.readFile(this.fullPath);
    }
    return this._cachedContents;
  }
}

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
