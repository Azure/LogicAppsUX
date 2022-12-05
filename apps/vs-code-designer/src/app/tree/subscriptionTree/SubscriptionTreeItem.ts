/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppKind, projectLanguageSetting, workflowappRuntime } from '../../../constants';
import { localize } from '../../../localize';
import { getDefaultFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { isProjectCV, isRemoteProjectCV } from '../../utils/tree/projectContextValues';
import { getWorkspaceSettingFromAnyFolder } from '../../utils/vsCodeConfig/settings';
import { ProductionSlotTreeItem } from '../slotsTree/ProductionSlotTreeItem';
import type { Site, WebSiteManagementClient } from '@azure/arm-appservice';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import type { FuncVersion, IFunctionAppWizardContext } from '@microsoft/utils-logic-apps';
import { AppKind, createWebSiteClient, ParsedSite } from '@microsoft/vscode-azext-azureappservice';
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
    return !isNullOrUndefined(this._nextLink);
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
      'azLogicAppInvalidLogicApp',
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
    // TODO (ccastrotrejo) - Implementation of create logic app
    const version: FuncVersion = await getDefaultFuncVersion(context);
    const language: string | undefined = getWorkspaceSettingFromAnyFolder(projectLanguageSetting);

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
