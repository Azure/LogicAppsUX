/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName } from '../../constants';
import { localize } from '../../localize';
import { parseHostJson } from '../funcConfig/host';
import { getLocalSettingsJson } from '../utils/appSettings/localSettings';
import { getFileOrFolderContent } from '../utils/codeless/apiUtils';
import { tryParseFuncVersion } from '../utils/funcCoreTools/funcVersion';
import { getIconPath } from '../utils/tree/assets';
import { matchesAnyPart } from '../utils/tree/projectContextValues';
import { ConfigurationsTreeItem } from './configurationsTree/ConfigurationsTreeItem';
import { RemoteWorkflowsTreeItem } from './remoteWorkflowsTree/RemoteWorkflowsTreeItem';
import type { SlotTreeItem } from './slotsTree/SlotTreeItem';
import { SlotsTreeItem } from './slotsTree/SlotsTreeItem';
import { ArtifactsTreeItem } from './slotsTree/artifactsTree/ArtifactsTreeItem';
import type { Site, SiteConfig, SiteSourceControl, StringDictionary } from '@azure/arm-appservice';
import { isString } from '@microsoft/logic-apps-shared';
import {
  DeleteLastServicePlanStep,
  DeleteSiteStep,
  DeploymentsTreeItem,
  DeploymentTreeItem,
  getFile,
  ParsedSite,
  AppSettingsTreeItem,
  LogFilesTreeItem,
  SiteFilesTreeItem,
} from '@microsoft/vscode-azext-azureappservice';
import type { IDeployContext } from '@microsoft/vscode-azext-azureappservice';
import { AzureWizard, DeleteConfirmationStep, nonNullValue } from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, IActionContext, ISubscriptionContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import type { ResolvedAppResourceBase } from '@microsoft/vscode-azext-utils/hostapi';
import { ProjectResource, ProjectSource, latestGAVersion } from '@microsoft/vscode-extension';
import type { ApplicationSettings, FuncHostRequest, FuncVersion, ILocalSettingsJson, IParsedHostJson } from '@microsoft/vscode-extension';
import * as path from 'path';

export function isLogicAppResourceTree(ti: unknown): ti is ResolvedAppResourceBase {
  return (ti as unknown as LogicAppResourceTree).instance === LogicAppResourceTree.instance;
}

export class LogicAppResourceTree implements ResolvedAppResourceBase {
  public static instance = 'logicAppResourceTree';
  public readonly instance = LogicAppResourceTree.instance;

  public site: ParsedSite;
  public data: Site;

  private _subscription: ISubscriptionContext;
  public logStreamPath = '';
  public appSettingsTreeItem: AppSettingsTreeItem;
  public deploymentsNode: DeploymentsTreeItem | undefined;
  public readonly source: ProjectSource = ProjectSource.Remote;

  public contextValuesToAdd?: string[] | undefined;
  public maskedValuesToAdd: string[] = [];

  public configurationsTreeItem: ConfigurationsTreeItem;
  private _cachedVersion: FuncVersion | undefined;
  private _cachedHostJson: IParsedHostJson | undefined;
  private _workflowsTreeItem: RemoteWorkflowsTreeItem | undefined;
  private _artifactsTreeItem: ArtifactsTreeItem;
  private _logFilesTreeItem: LogFilesTreeItem;
  private _siteFilesTreeItem: SiteFilesTreeItem;
  private _slotsTreeItem: SlotsTreeItem;

  private _cachedIsConsumption: boolean | undefined;

  public static pickSlotContextValue = new RegExp(/azLogicAppsSlot(?!s)/);
  public static productionContextValue = 'azLogicAppsProductionSlot';
  public static slotContextValue = 'azLogicAppsSlot';

  commandId?: string | undefined;
  tooltip?: string | undefined;
  commandArgs?: unknown[] | undefined;

  public constructor(subscription: ISubscriptionContext, site: Site) {
    this.site = new ParsedSite(site, subscription);
    this.data = this.site.rawSite;
    this._subscription = subscription;
    this.contextValuesToAdd = [this.site.isSlot ? LogicAppResourceTree.slotContextValue : LogicAppResourceTree.productionContextValue];

    const valuesToMask = [
      this.site.siteName,
      this.site.slotName,
      this.site.defaultHostName,
      this.site.resourceGroup,
      this.site.planName,
      this.site.planResourceGroup,
      this.site.kuduHostName,
      this.site.gitUrl,
      this.site.rawSite.repositorySiteName,
      ...(this.site.rawSite.hostNames || []),
      ...(this.site.rawSite.enabledHostNames || []),
    ];

    for (const v of valuesToMask) {
      if (v) {
        this.maskedValuesToAdd.push(v);
      }
    }
  }

  public static createLogicAppResourceTree(context: IActionContext, subscription: ISubscriptionContext, site: Site): LogicAppResourceTree {
    const resource = new LogicAppResourceTree(subscription, site);
    void resource.site.createClient(context).then(async (client) => (resource.data.siteConfig = await client.getSiteConfig()));
    return resource;
  }

  public get name(): string {
    return this.label;
  }

  public get label(): string {
    return this.site.slotName ?? this.site.fullName;
  }

  public get id(): string {
    return this.site.id;
  }

  public get logStreamLabel(): string {
    return this.site.fullName;
  }

  public async getHostRequest(): Promise<FuncHostRequest> {
    return { url: this.site.defaultHostUrl };
  }

  public get description(): string | undefined {
    return this._state?.toLowerCase() !== 'running' ? this._state : undefined;
  }

  public get iconPath(): TreeItemIconPath {
    const proxyTree: SlotTreeItem = this as unknown as SlotTreeItem;
    return getIconPath(proxyTree.contextValue);
  }

  private get _state(): string | undefined {
    return this.site.rawSite.state;
  }

  public hasMoreChildrenImpl(): boolean {
    return false;
  }

  /**
   * NOTE: We need to be extra careful in this method because it blocks many core scenarios (e.g. deploy) if the tree item is listed as invalid
   */
  public async refreshImpl(context: IActionContext): Promise<void> {
    this._cachedVersion = undefined;
    this._cachedHostJson = undefined;
    this._cachedIsConsumption = undefined;

    const client = await this.site.createClient(context);
    this.site = new ParsedSite(nonNullValue(await client.getSite(), 'site'), this._subscription);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    const proxyTree: SlotTreeItem = this as unknown as SlotTreeItem;

    this.deploymentsNode = new DeploymentsTreeItem(proxyTree, {
      site: this.site,
      siteConfig: siteConfig,
      sourceControl: sourceControl,
    });

    this.deploymentsNode = new DeploymentsTreeItem(proxyTree, {
      site: this.site,
      siteConfig,
      sourceControl,
      contextValuesToAdd: ['azLogicApps'],
    });
    this.appSettingsTreeItem = new AppSettingsTreeItem(proxyTree, this.site, {
      contextValuesToAdd: ['azLogicApps'],
    });
    this._siteFilesTreeItem = new SiteFilesTreeItem(proxyTree, {
      site: this.site,
      isReadOnly: true,
      contextValuesToAdd: ['azLogicApps'],
    });
    this._logFilesTreeItem = new LogFilesTreeItem(proxyTree, {
      site: this.site,
      contextValuesToAdd: ['azLogicApps'],
    });

    if (!this._workflowsTreeItem) {
      this._workflowsTreeItem = await RemoteWorkflowsTreeItem.createWorkflowsTreeItem(context, proxyTree);
    }

    if (!this.configurationsTreeItem) {
      this.configurationsTreeItem = await ConfigurationsTreeItem.createConfigurationsTreeItem(proxyTree, context);
    }

    const children: AzExtTreeItem[] = [
      this._workflowsTreeItem,
      this.configurationsTreeItem,
      this._siteFilesTreeItem,
      this._logFilesTreeItem,
      this.deploymentsNode,
    ];

    if (!this.site.isSlot) {
      this._slotsTreeItem = new SlotsTreeItem(proxyTree);
      children.push(this._slotsTreeItem);
    }

    if (!this._artifactsTreeItem) {
      try {
        await getFileOrFolderContent(context, proxyTree, 'Artifacts');
      } catch (error) {
        if (error.statusCode === 404) {
          return children;
        }
      }
      this._artifactsTreeItem = new ArtifactsTreeItem(proxyTree, this.site);
      children.push(this._artifactsTreeItem);
    }
    return children;
  }

  public async pickTreeItemImpl(expectedContextValues: (string | RegExp)[]): Promise<AzExtTreeItem | undefined> {
    if (!this.site.isSlot) {
      for (const expectedContextValue of expectedContextValues) {
        switch (expectedContextValue) {
          case SlotsTreeItem.contextValue:
          case LogicAppResourceTree.slotContextValue:
            return this._slotsTreeItem;
          default:
        }
      }
    }

    for (const expectedContextValue of expectedContextValues) {
      if (expectedContextValue instanceof RegExp) {
        const appSettingsContextValues = [ConfigurationsTreeItem.contextValue];
        if (matchContextValue(expectedContextValue, appSettingsContextValues)) {
          return this.configurationsTreeItem;
        }
        const deploymentsContextValues = [
          DeploymentsTreeItem.contextValueConnected,
          DeploymentsTreeItem.contextValueUnconnected,
          DeploymentTreeItem.contextValue,
        ];
        if (matchContextValue(expectedContextValue, deploymentsContextValues)) {
          return this.deploymentsNode;
        }

        if (matchContextValue(expectedContextValue, [LogicAppResourceTree.slotContextValue])) {
          return this._slotsTreeItem;
        }
      }

      if (isString(expectedContextValue)) {
        // DeploymentTreeItem.contextValue is a RegExp, but the passed in contextValue can be a string so check for a match
        if (DeploymentTreeItem.contextValue.test(expectedContextValue)) {
          return this.deploymentsNode;
        }
      } else if (matchesAnyPart(expectedContextValue, ProjectResource.Workflows, ProjectResource.Workflow)) {
        return this._workflowsTreeItem;
      }
    }
    return undefined;
  }

  public compareChildrenImpl(): number {
    return 0; // already sorted
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

    const wizardContext = Object.assign(context, {
      site: this.site,
    });

    const wizard = new AzureWizard(wizardContext, {
      title: localize('deleteSwa', 'Delete Function App "{0}"', this.label),
      promptSteps: [new DeleteConfirmationStep(confirmationMessage), new DeleteLastServicePlanStep()],
      executeSteps: [new DeleteSiteStep()],
    });

    await wizard.prompt();
    await wizard.execute();
  }
}

function matchContextValue(expectedContextValue: RegExp | string, matches: (string | RegExp)[]): boolean {
  if (expectedContextValue instanceof RegExp) {
    return matches.some((match) => {
      if (match instanceof RegExp) {
        return expectedContextValue.toString() === match.toString();
      }
      return expectedContextValue.test(match);
    });
  } else {
    return matches.some((match) => {
      if (match instanceof RegExp) {
        return match.test(expectedContextValue);
      }
      return expectedContextValue === match;
    });
  }
}
