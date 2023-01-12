/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getLatestVersion, getRelease } from '../../app/utils/cliFeed';
import { getTemplateKeyFromFeedEntry, getTemplateKeyFromProjFile } from '../../app/utils/dotnet/dotnet';
import { validateDotnetInstalled } from '../../app/utils/dotnet/executeDotnetTemplateCommand';
import { parseJson } from '../../app/utils/parseJson';
import { downloadFile } from '../../app/utils/requestUtils';
import { TemplateProviderBase, TemplateType } from '../TemplateProviderBase';
import { getDotnetProjectTemplatePath, getDotnetItemTemplatePath, executeDotnetTemplateCommand } from './executeDotnetTemplateCommand';
import { parseDotnetTemplates } from './parseDotnetTemplates';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzExtFsExtra, nonNullValue } from '@microsoft/vscode-azext-utils';
import type { IWorkerRuntime, ITemplates, IRelease } from '@microsoft/vscode-extension';
import { ProjectLanguage } from '@microsoft/vscode-extension';
import * as path from 'path';

export class DotnetTemplateProvider extends TemplateProviderBase {
  public templateType: TemplateType = TemplateType.Dotnet;
  private _rawTemplates: object[];

  protected get backupSubpath(): string {
    return path.join('dotnet', this.version);
  }

  public async refreshProjKey(context: IActionContext): Promise<string> {
    return await getTemplateKeyFromProjFile(context, this.projectPath, this.version, ProjectLanguage.FSharp);
  }

  public async getCachedTemplates(context: IActionContext): Promise<ITemplates | undefined> {
    const projKey = await this.getProjKey(context);
    const projectFilePath: string = getDotnetProjectTemplatePath(context, this.version, projKey);
    const itemFilePath: string = getDotnetItemTemplatePath(context, this.version, projKey);
    if (!(await AzExtFsExtra.pathExists(projectFilePath)) || !(await AzExtFsExtra.pathExists(itemFilePath))) {
      return undefined;
    }

    const cachedDotnetTemplates: object[] | undefined = await this.getCachedValue(projKey);
    if (cachedDotnetTemplates) {
      return await parseDotnetTemplates(cachedDotnetTemplates, this.version);
    } else {
      return undefined;
    }
  }

  public async getLatestTemplateVersion(context: IActionContext): Promise<string> {
    return await getLatestVersion(context, this.version);
  }

  public async getLatestTemplates(context: IActionContext, latestTemplateVersion: string): Promise<ITemplates> {
    await validateDotnetInstalled(context);

    const projKey = await this.getProjKey(context);
    const projectFilePath: string = getDotnetProjectTemplatePath(context, this.version, projKey);
    const itemFilePath: string = getDotnetItemTemplatePath(context, this.version, projKey);

    const netRelease = nonNullValue(await this.getNetRelease(context, projKey, latestTemplateVersion), 'netRelease');

    await Promise.all([
      downloadFile(context, netRelease.projectTemplates, projectFilePath),
      downloadFile(context, netRelease.itemTemplates, itemFilePath),
    ]);

    return await this.parseTemplates(context, projKey);
  }

  private async getNetRelease(context: IActionContext, projKey: string, templateVersion: string): Promise<IWorkerRuntime | undefined> {
    const funcRelease: IRelease = await getRelease(context, templateVersion);
    return Object.values(funcRelease.workerRuntimes.dotnet).find((r) => projKey === getTemplateKeyFromFeedEntry(r));
  }

  public async getBackupTemplates(context: IActionContext): Promise<ITemplates> {
    const projKey = await this.getProjKey(context);
    const files: string[] = [
      getDotnetProjectTemplatePath(context, this.version, projKey),
      getDotnetItemTemplatePath(context, this.version, projKey),
    ];
    for (const file of files) {
      await AzExtFsExtra.copy(this.convertToBackupFilePath(projKey, file), file, { overwrite: true });
    }
    return await this.parseTemplates(context, projKey);
  }

  private convertToBackupFilePath(projKey: string, file: string): string {
    return path.join(this.getBackupPath(), projKey, path.basename(file));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async cacheTemplates(context: IActionContext): Promise<void> {
    const projKey = await this.getProjKey(context);
    await this.updateCachedValue(projKey, this._rawTemplates);
  }

  private async parseTemplates(context: IActionContext, projKey: string): Promise<ITemplates> {
    this._rawTemplates = parseJson(await executeDotnetTemplateCommand(context, this.version, projKey, undefined, 'list'));
    return parseDotnetTemplates(this._rawTemplates, this.version);
  }
}
