/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { funcVersionSetting, logicAppKind, projectLanguageSetting, workflowappRuntime } from '../../constants';
import { localize } from '../../localize';
import { tryParseFuncVersion } from '../utils/funcCoreTools/funcVersion';
import { tryGetLocalFuncVersion } from '../utils/funcCoreTools/tryGetLocalFuncVersion';
import { getWorkspaceSettingFromAnyFolder } from '../utils/vsCodeConfig/settings';
import { ProductionSlotTreeItem } from './ProductionSlotTreeItem';
import { isProjectCV, isRemoteProjectCV } from './projectContextValues';
import type { Site, WebSiteManagementClient } from '@azure/arm-appservice';
import { latestGAVersion } from '@microsoft-logic-apps/utils';
import type { FuncVersion, IFunctionAppWizardContext } from '@microsoft-logic-apps/utils';
import { AppKind, createWebSiteClient, ParsedSite, WebsiteOS } from '@microsoft/vscode-azext-azureappservice';
import type { IAppServiceWizardContext } from '@microsoft/vscode-azext-azureappservice';
import { SubscriptionTreeItemBase, uiUtils } from '@microsoft/vscode-azext-azureutils';
import type { AzExtTreeItem, IActionContext, ICreateChildImplContext } from '@microsoft/vscode-azext-utils';
import { nonNullProp, parseError } from '@microsoft/vscode-azext-utils';

export interface ICreateFuntionAppContext extends ICreateChildImplContext {
  newResourceGroupName?: string;
}

export class SubscriptionTreeItem extends SubscriptionTreeItemBase {
  public readonly childTypeLabel: string = localize('LogicApp', 'Logic App (Standard) in Azure');
  public supportsAdvancedCreation = true;

  private _nextLink: string | undefined;

  public hasMoreChildrenImpl(): boolean {
    return this._nextLink !== undefined;
  }

  public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
    if (clearCache) {
      this._nextLink = undefined;
    }

    const client: WebSiteManagementClient = await createWebSiteClient([context, this]);
    let webAppCollection: Site[];
    try {
      webAppCollection = await uiUtils.listAllIterator(client.webApps.list());
    } catch (error) {
      if (parseError(error).errorType.toLowerCase() === 'notfound') {
        // This error type means the 'Microsoft.Web' provider has not been registered in this subscription
        // In that case, we know there are no Function Apps, so we can return an empty array
        // (The provider will be registered automatically if the user creates a new Function App)
        return [];
      } else {
        throw error;
      }
    }

    return await this.createTreeItemsWithErrorHandling(
      webAppCollection,
      'azFuncInvalidFunctionApp',
      async (site: Site) => {
        const parsedSite = new ParsedSite(site, this.subscription);
        if (site.kind.includes(logicAppKind)) {
          return new ProductionSlotTreeItem(this, parsedSite);
        }
        return undefined;
      },
      (site: Site) => {
        return site.name;
      }
    );
  }

  /* eslint-disable no-param-reassign */
  public async createChildImpl(context: ICreateFuntionAppContext): Promise<AzExtTreeItem> {
    const version: FuncVersion = await getDefaultFuncVersion(context);
    context.telemetry.properties.projectRuntime = version;
    const language: string | undefined = getWorkspaceSettingFromAnyFolder(projectLanguageSetting);
    context.telemetry.properties.projectLanguage = language;

    const wizardContext: IFunctionAppWizardContext = Object.assign(context, this.subscription, {
      newSiteKind: AppKind.workflowapp,
      resourceGroupDeferLocationStep: true,
      version,
      language,
      newSiteRuntime: workflowappRuntime,
    });

    const site = new ParsedSite(nonNullProp(wizardContext, 'site'), this.subscription);
    return new ProductionSlotTreeItem(this, site);
  }
  /* eslint-enable no-param-reassign */

  public isAncestorOfImpl(contextValue: string | RegExp): boolean {
    return !isProjectCV(contextValue) || isRemoteProjectCV(contextValue);
  }
}

/* eslint-disable no-param-reassign */
export function setSiteOS(context: IAppServiceWizardContext): void {
  if (context.customLocation) {
    context.newSiteOS = WebsiteOS.linux;
  } else {
    context.newSiteOS = WebsiteOS.windows;
  }
}
/* eslint-enable no-param-reassign */

/* eslint-disable no-param-reassign */
async function getDefaultFuncVersion(context: IActionContext): Promise<FuncVersion> {
  // Try to get VS Code setting for version (aka if they have a project open)
  let version: FuncVersion | undefined = tryParseFuncVersion(getWorkspaceSettingFromAnyFolder(funcVersionSetting));
  context.telemetry.properties.runtimeSource = 'VSCodeSetting';

  if (version === undefined) {
    // Try to get the version that matches their local func cli
    version = await tryGetLocalFuncVersion();
    context.telemetry.properties.runtimeSource = 'LocalFuncCli';
  }

  if (version === undefined) {
    version = latestGAVersion;
    context.telemetry.properties.runtimeSource = 'Backup';
  }

  return version;
}
/* eslint-enable no-param-reassign */
