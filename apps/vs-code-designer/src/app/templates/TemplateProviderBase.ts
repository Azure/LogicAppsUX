/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { NotImplementedError } from '../utils/errors';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ITemplates } from '@microsoft/vscode-extension-logic-apps';
import { FuncVersion, TemplateType } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import * as vscode from 'vscode';
import { Disposable } from 'vscode';

const v3BackupTemplatesVersion = '3.4.1';
const v2BackupTemplatesVersion = '2.47.1';
const v1BackupTemplatesVersion = '1.11.0';

export abstract class TemplateProviderBase implements Disposable {
  protected static templateVersionCacheKey = 'templateVersion';
  protected static projTemplateKeyCacheKey = 'projectTemplateKey';
  public abstract templateType: TemplateType;
  public readonly version: FuncVersion;
  public readonly projectPath: string | undefined;
  public resourcesLanguage: string | undefined;

  /**
   * Indicates a related setting/file changed, so we should refresh the worker runtime key next time we get templates
   * We want to delay reading those files until necessary for performance reasons, hence "may have"
   */
  private _projKeyMayHaveChanged: boolean;

  /**
   * The project key cached for this session of VS Code, purely meant for performance (since we don't want to read the file system to get detect the proj key every time)
   * NOTE: Not using "cache" in the name because all other "cache" properties/methods are related to the global state cache we use accross sessions
   */
  protected _sessionProjKey: string | undefined;

  protected abstract backupSubpath: string;
  protected _disposables: Disposable[] = [];

  public constructor(version: FuncVersion, projectPath: string | undefined) {
    this.version = version;
    this.projectPath = projectPath;
  }

  public dispose(): void {
    Disposable.from(...this._disposables).dispose();
  }

  /**
   * Optional method if the provider has project-specific templates
   */
  protected refreshProjKey?(context: IActionContext): Promise<string>;

  public projKeyMayHaveChanged(): void {
    this._projKeyMayHaveChanged = true;
  }

  /**
   * A key used to identify the templates for the current type of project
   */
  public async getProjKey(context: IActionContext): Promise<string> {
    if (!this.refreshProjKey) {
      throw new NotImplementedError('refreshProjKey', this);
    }

    if (!this._sessionProjKey) {
      this._sessionProjKey = await this.refreshProjKey(context);
    }

    return this._sessionProjKey;
  }

  public async updateCachedValue(key: string, value: unknown): Promise<void> {
    ext.context.globalState.update(await this.getCacheKey(key), value);
  }

  public async getCachedValue<T>(key: string): Promise<T | undefined> {
    return ext.context.globalState.get<T>(await this.getCacheKey(key));
  }

  public abstract getLatestTemplateVersion(context: IActionContext): Promise<string>;
  public abstract getLatestTemplates(context: IActionContext, latestTemplateVersion: string): Promise<ITemplates>;
  public abstract getCachedTemplates(context: IActionContext): Promise<ITemplates | undefined>;
  public abstract getBackupTemplates(context: IActionContext): Promise<ITemplates>;
  public abstract cacheTemplates(context: IActionContext): Promise<void>;

  /**
   * Unless this is overidden, all templates will be included
   */
  public includeTemplate(): boolean {
    return true;
  }

  public async getCachedTemplateVersion(): Promise<string | undefined> {
    return this.getCachedValue(TemplateProviderBase.templateVersionCacheKey);
  }

  public async cacheTemplateMetadata(templateVersion: string): Promise<void> {
    await this.updateCachedValue(TemplateProviderBase.templateVersionCacheKey, templateVersion);
    await this.updateCachedValue(TemplateProviderBase.projTemplateKeyCacheKey, this._sessionProjKey);
  }

  public getBackupTemplateVersion(): string {
    switch (this.version) {
      case FuncVersion.v1:
        return v1BackupTemplatesVersion;
      case FuncVersion.v2:
        return v2BackupTemplatesVersion;
      case FuncVersion.v3:
        return v3BackupTemplatesVersion;
      default:
        throw new RangeError(localize('invalidVersion', 'Invalid version "{0}".', this.version));
    }
  }

  protected async getCacheKeySuffix(): Promise<string> {
    return '';
  }

  /**
   * Adds version, templateType, and language information to a key to ensure there are no collisions in the cache
   * For backwards compatability, the original version, templateType, and language will not have this information
   */
  private async getCacheKey(key: string): Promise<string> {
    key = key + (await this.getCacheKeySuffix());

    if (this.version !== FuncVersion.v1) {
      key = `${key}.${this.version}`;
    }

    if (this.templateType !== TemplateType.Script) {
      key = `${key}.${this.templateType}`;
    }

    if (vscode.env.language && !/^en(-us)?$/i.test(vscode.env.language)) {
      key = `${key}.${vscode.env.language}`;
    }

    return key;
  }

  protected getBackupPath(): string {
    return ext.context.asAbsolutePath(path.join('assets', 'backupTemplates', this.backupSubpath));
  }

  /**
   * Returns true if this template provider has project-specific templates
   */
  public supportsProjKey(): boolean {
    return !!this.refreshProjKey;
  }

  /**
   * Returns true if the key changed
   */
  public async updateProjKeyIfChanged(context: IActionContext, projKey: string | undefined): Promise<boolean> {
    let hasChanged: boolean;
    if (!this.refreshProjKey) {
      hasChanged = false; // proj keys not supported, so it's impossible to have changed
    } else if (projKey) {
      hasChanged = this._sessionProjKey !== projKey;
      this._sessionProjKey = projKey;
    } else if (this._projKeyMayHaveChanged) {
      const latestProjKey = await this.refreshProjKey(context);
      hasChanged = this._sessionProjKey !== latestProjKey;
      this._sessionProjKey = latestProjKey;
    } else {
      hasChanged = false;
    }

    this._projKeyMayHaveChanged = false;
    return hasChanged;
  }
}
