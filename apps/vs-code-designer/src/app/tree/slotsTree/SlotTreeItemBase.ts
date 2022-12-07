/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName } from '../../../constants';
import { localize } from '../../../localize';
import { parseHostJson } from '../../funcConfig/host';
import { getFileOrFolderContent } from '../../utils/codeless/apiUtils';
import { tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getLocalSettingsJson } from '../../utils/localSettings';
import type {
  ApplicationSettings,
  FuncHostRequest,
  FuncVersion,
  ILocalSettingsJson,
  IParsedHostJson,
  IProjectTreeItem,
} from '../../utils/models';
import { latestGAVersion, ProjectSource } from '../../utils/models';
import { getIconPath } from '../../utils/tree/assets';
import { ConfigurationsTreeItem } from '../configurationsTree/ConfigurationsTreeItem';
import { RemoteWorkflowsTreeItem } from '../remoteWorkflowsTree/RemoteWorkflowsTreeItem';
import { ArtifactsTreeItem } from './artifactsTree/ArtifactsTreeItem';
import type { SiteConfig, SiteSourceControl, StringDictionary } from '@azure/arm-appservice';
import { isString } from '@microsoft/utils-logic-apps';
import {
  AppSettingsTreeItem,
  DeleteLastServicePlanStep,
  DeleteSiteStep,
  DeploymentsTreeItem,
  DeploymentTreeItem,
  getFile,
  LogFilesTreeItem,
  ParsedSite,
  SiteFilesTreeItem,
} from '@microsoft/vscode-azext-azureappservice';
import type { IDeployContext } from '@microsoft/vscode-azext-azureappservice';
import { AzExtParentTreeItem, AzureWizard, DeleteConfirmationStep, nonNullValue } from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, IActionContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import * as path from 'path';

export abstract class SlotTreeItemBase extends AzExtParentTreeItem implements IProjectTreeItem {
  public configurationsTreeItem: ConfigurationsTreeItem;
  public deploymentsNode: DeploymentsTreeItem | undefined;
  public readonly source: ProjectSource = ProjectSource.Remote;
  public site: ParsedSite;
  public readonly appSettingsTreeItem: AppSettingsTreeItem;

  public abstract readonly contextValue: string;
  public abstract readonly label: string;

  private readonly _logFilesTreeItem: LogFilesTreeItem;
  private readonly _siteFilesTreeItem: SiteFilesTreeItem;
  private _cachedVersion: FuncVersion | undefined;
  private _cachedHostJson: IParsedHostJson | undefined;
  private _cachedIsConsumption: boolean | undefined;
  private _workflowsTreeItem: RemoteWorkflowsTreeItem | undefined;
  private _artifactsTreeItem: ArtifactsTreeItem;

  public constructor(parent: AzExtParentTreeItem, site: ParsedSite) {
    super(parent);
    this.site = site;
    this._siteFilesTreeItem = new SiteFilesTreeItem(this, {
      site: site,
      isReadOnly: true,
    });
    this._logFilesTreeItem = new LogFilesTreeItem(this, {
      site: site,
    });
    this.appSettingsTreeItem = new AppSettingsTreeItem(this, site);
  }

  public get id(): string {
    return this.site.id;
  }

  public get iconPath(): TreeItemIconPath {
    return getIconPath(this.contextValue);
  }

  public hasMoreChildrenImpl(): boolean {
    return false;
  }

  public get logStreamLabel(): string {
    return this.site.fullName;
  }

  public get logStreamPath(): string {
    return `application/functions/function/${encodeURIComponent(this.site.fullName)}`;
  }

  public async getHostRequest(): Promise<FuncHostRequest> {
    return { url: this.site.defaultHostUrl };
  }

  /**
   * NOTE: We need to be extra careful in this method because it blocks many core scenarios (e.g. deploy) if the tree item is listed as invalid
   */
  public async refreshImpl(context: IActionContext): Promise<void> {
    this._cachedVersion = undefined;
    this._cachedHostJson = undefined;
    this._cachedIsConsumption = undefined;

    const client = await this.site.createClient(context);
    this.site = new ParsedSite(nonNullValue(await client.getSite(), 'site'), this.subscription);
  }

  public async getVersion(context: IActionContext): Promise<FuncVersion> {
    let result: FuncVersion | undefined = this._cachedVersion;
    if (result === undefined) {
      let version: FuncVersion | undefined;
      try {
        const client = await this.site.createClient(context);
        const appSettings: StringDictionary = await client.listApplicationSettings();
        version = tryParseFuncVersion(appSettings.properties && appSettings.properties.FUNCTIONS_EXTENSION_VERSION);
      } catch {
        // ignore and use default
      }
      // tslint:disable-next-line: strict-boolean-expressions
      result = version || latestGAVersion;
      this._cachedVersion = result;
    }

    return result;
  }

  public async getHostJson(context: IActionContext): Promise<IParsedHostJson> {
    let result: IParsedHostJson | undefined = this._cachedHostJson;
    if (!result) {
      let data: any;
      try {
        data = JSON.parse((await getFile(context, this.site, 'site/wwwroot/host.json')).data);
      } catch {
        // ignore and use default
      }
      const version: FuncVersion = await this.getVersion(context);
      result = parseHostJson(data, version);
      this._cachedHostJson = result;
    }

    return result;
  }

  public async getApplicationSettings(context: IDeployContext): Promise<ApplicationSettings> {
    const localSettings: ILocalSettingsJson = await getLocalSettingsJson(
      context,
      path.join(context.effectiveDeployFsPath, localSettingsFileName)
    );
    return localSettings.Values || {};
  }

  public async setApplicationSetting(context: IActionContext, key: string, value: string): Promise<void> {
    const client = await this.site.createClient(context);
    const settings: StringDictionary = await client.listApplicationSettings();
    if (!settings.properties) {
      settings.properties = {};
    }
    settings.properties[key] = value;
    await client.updateApplicationSettings(settings);
  }

  public async getIsConsumption(context: IActionContext): Promise<boolean> {
    let result: boolean | undefined = this._cachedIsConsumption;
    if (result === undefined) {
      try {
        const client = await this.site.createClient(context);
        result = await client.getIsConsumption(context);
      } catch {
        // ignore and use default
        result = true;
      }
      this._cachedIsConsumption = result;
    }

    return result;
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
    const client = await this.site.createClient(context);
    const siteConfig: SiteConfig = await client.getSiteConfig();
    const sourceControl: SiteSourceControl = await client.getSourceControl();
    this.deploymentsNode = new DeploymentsTreeItem(this, {
      site: this.site,
      siteConfig: siteConfig,
      sourceControl: sourceControl,
    });

    if (!this._workflowsTreeItem) {
      this._workflowsTreeItem = await RemoteWorkflowsTreeItem.createWorkflowsTreeItem(context, this);
    }

    if (!this.configurationsTreeItem) {
      this.configurationsTreeItem = await ConfigurationsTreeItem.createConfigurationsTreeItem(this, context);
    }

    if (!this._artifactsTreeItem) {
      try {
        await getFileOrFolderContent(context, this, 'Artifacts');
      } catch (error) {
        if (error.statusCode === 404) {
          return [
            this._workflowsTreeItem,
            this.configurationsTreeItem,
            this._siteFilesTreeItem,
            this._logFilesTreeItem,
            this.deploymentsNode,
          ];
        }
      }

      this._artifactsTreeItem = new ArtifactsTreeItem(this, this.site);
    }

    return [
      this._workflowsTreeItem,
      this.configurationsTreeItem,
      this._artifactsTreeItem,
      this._siteFilesTreeItem,
      this._logFilesTreeItem,
      this.deploymentsNode,
    ];
  }

  public async pickTreeItemImpl(expectedContextValues: (string | RegExp)[], _context: IActionContext): Promise<AzExtTreeItem | undefined> {
    for (const expectedContextValue of expectedContextValues) {
      switch (expectedContextValue) {
        case ConfigurationsTreeItem.contextValue:
          return this.configurationsTreeItem;
        case DeploymentsTreeItem.contextValueConnected:
        case DeploymentsTreeItem.contextValueUnconnected:
        case DeploymentTreeItem.contextValue:
          return this.deploymentsNode;
        default:
          if (isString(expectedContextValue)) {
            // DeploymentTreeItem.contextValue is a RegExp, but the passed in contextValue can be a string so check for a match
            if (DeploymentTreeItem.contextValue.test(expectedContextValue)) {
              return this.deploymentsNode;
            }
          }
      }
    }

    return undefined;
  }

  public compareChildrenImpl(): number {
    return 0;
  }

  public async isReadOnly(context: IActionContext): Promise<boolean> {
    const client = await this.site.createClient(context);
    const appSettings: StringDictionary = await client.listApplicationSettings();
    return !!appSettings.properties && !!(appSettings.properties.WEBSITE_RUN_FROM_PACKAGE || appSettings.properties.WEBSITE_RUN_FROM_ZIP);
  }

  public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
    const { isSlot, fullName, isFunctionApp } = this.site;
    const confirmationMessage: string = isSlot
      ? localize('confirmDeleteSlot', 'Are you sure you want to delete slot "{0}"?', fullName)
      : isFunctionApp
      ? localize('confirmDeleteFunctionApp', 'Are you sure you want to delete function app "{0}"?', fullName)
      : localize('confirmDeleteWebApp', 'Are you sure you want to delete web app "{0}"?', fullName);

    const wizard = new AzureWizard(context, {
      title: localize('deleteSwa', 'Delete Function App "{0}"', this.label),
      promptSteps: [new DeleteConfirmationStep(confirmationMessage), new DeleteLastServicePlanStep()],
      executeSteps: [new DeleteSiteStep()],
    });

    await wizard.prompt();
    await wizard.execute();
  }
}
