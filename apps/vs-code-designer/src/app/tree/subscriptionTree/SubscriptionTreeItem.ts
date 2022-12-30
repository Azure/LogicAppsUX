/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppKind, projectLanguageSetting, workflowappRuntime } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { LogicAppCreateStep } from '../../commands/createLogicApp/createLogicAppSteps/LogicAppCreateStep';
import { LogicAppHostingPlanStep } from '../../commands/createLogicApp/createLogicAppSteps/LogicAppHostingPlanStep';
import { AzureStorageAccountStep } from '../../commands/deploy/storageAccountSteps/AzureStorageAccountStep';
import { CustomLocationStorageAccountStep } from '../../commands/deploy/storageAccountSteps/CustomLocationStorageAccountStep';
import { enableFileLogging } from '../../commands/logstream/enableFileLogging';
import { verifyDeploymentResourceGroup } from '../../utils/codeless/common';
import { getDefaultFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { isProjectCV, isRemoteProjectCV } from '../../utils/tree/projectContextValues';
import { getFunctionsWorkerRuntime, getWorkspaceSettingFromAnyFolder } from '../../utils/vsCodeConfig/settings';
import { ProductionSlotTreeItem } from '../slotsTree/ProductionSlotTreeItem';
import type { Site, WebSiteManagementClient } from '@azure/arm-appservice';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import {
  AppInsightsCreateStep,
  AppInsightsListStep,
  AppKind,
  AppServicePlanCreateStep,
  createWebSiteClient,
  CustomLocationListStep,
  ParsedSite,
  SiteNameStep,
  WebsiteOS,
} from '@microsoft/vscode-azext-azureappservice';
import type { IAppServiceWizardContext, SiteClient } from '@microsoft/vscode-azext-azureappservice';
import type { INewStorageAccountDefaults } from '@microsoft/vscode-azext-azureutils';
import {
  ResourceGroupListStep,
  StorageAccountCreateStep,
  StorageAccountKind,
  StorageAccountListStep,
  StorageAccountPerformance,
  StorageAccountReplication,
  SubscriptionTreeItemBase,
  uiUtils,
  VerifyProvidersStep,
} from '@microsoft/vscode-azext-azureutils';
import type { AzExtTreeItem, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext } from '@microsoft/vscode-azext-utils';
import { nonNullProp, parseError, AzureWizard } from '@microsoft/vscode-azext-utils';
import type { IFunctionAppWizardContext, ICreateLogicAppContext } from '@microsoft/vscode-extension';
import { FuncVersion } from '@microsoft/vscode-extension';

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

  public async createChildImpl(context: ICreateLogicAppContext): Promise<AzExtTreeItem> {
    const version: FuncVersion = await getDefaultFuncVersion(context);
    const language: string | undefined = getWorkspaceSettingFromAnyFolder(projectLanguageSetting);

    context.telemetry.properties.projectRuntime = version;
    context.telemetry.properties.projectLanguage = language;

    const wizardContext: IFunctionAppWizardContext = Object.assign(context, this.subscription, {
      newSiteKind: AppKind.workflowapp,
      resourceGroupDeferLocationStep: true,
      version,
      language,
      newSiteRuntime: workflowappRuntime,
    });

    if (version === FuncVersion.v1) {
      // v1 doesn't support linux
      wizardContext.newSiteOS = WebsiteOS.windows;
    }

    await setRegionsTask(wizardContext);

    const promptSteps: AzureWizardPromptStep<IAppServiceWizardContext>[] = [];
    const executeSteps: AzureWizardExecuteStep<IAppServiceWizardContext>[] = [];

    promptSteps.push(new SiteNameStep());
    CustomLocationListStep.addStep(context as any, promptSteps);
    promptSteps.push(new LogicAppHostingPlanStep());
    promptSteps.push(new ResourceGroupListStep());

    const storageAccountCreateOptions: INewStorageAccountDefaults = {
      kind: StorageAccountKind.Storage,
      performance: StorageAccountPerformance.Standard,
      replication: StorageAccountReplication.LRS,
    };

    if (!context.advancedCreation) {
      wizardContext.runtimeFilter = getFunctionsWorkerRuntime(language);
      executeSteps.push(new StorageAccountCreateStep(storageAccountCreateOptions));
      executeSteps.push(new AppInsightsCreateStep());
    } else {
      if (wizardContext.customLocation) {
        promptSteps.push(new CustomLocationStorageAccountStep(context));
      } else {
        promptSteps.push(
          new StorageAccountListStep(storageAccountCreateOptions, {
            kind: [StorageAccountKind.BlobStorage],
            performance: [StorageAccountPerformance.Premium],
            replication: [StorageAccountReplication.ZRS],
            learnMoreLink: 'https://aka.ms/Cfqnrc',
          })
        );
        promptSteps.push(new AzureStorageAccountStep());
        promptSteps.push(new AppInsightsListStep());
      }
    }

    executeSteps.push(new VerifyProvidersStep(['Microsoft.Web', 'Microsoft.Storage', 'Microsoft.Insights']));
    executeSteps.push(new LogicAppCreateStep());

    const title: string = localize('functionAppCreatingTitle', 'Create new Logic App (Standard) in Azure');
    const wizard: AzureWizard<IAppServiceWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title });

    await wizard.prompt();

    if (wizardContext.customLocation) {
      setSiteOS(wizardContext);
      executeSteps.unshift(new AppServicePlanCreateStep());
    }

    context.showCreatingTreeItem(nonNullProp(wizardContext, 'newSiteName'));
    context.telemetry.properties.os = wizardContext.newSiteOS;
    context.telemetry.properties.runtime = wizardContext.newSiteRuntime;

    if (!context.advancedCreation) {
      const newName: string | undefined = await wizardContext.relatedNameTask;
      if (!newName) {
        throw new Error(
          localize('noUniqueName', 'Failed to generate unique name for resources. Use advanced creation to manually enter resource names.')
        );
      }

      wizardContext.newStorageAccountName = newName;
      wizardContext.newAppInsightsName = newName;
    }

    if (ext.deploymentFolderPath) {
      let resourceGroupName: string | undefined;

      if (wizardContext.newResourceGroupName) {
        resourceGroupName = wizardContext.newResourceGroupName;
      } else if (wizardContext.resourceGroup && wizardContext.resourceGroup.name) {
        resourceGroupName = wizardContext.resourceGroup.name;
      }

      if (resourceGroupName) {
        await verifyDeploymentResourceGroup(context, resourceGroupName, ext.deploymentFolderPath);
      }
    }

    await wizard.execute();

    const site = new ParsedSite(nonNullProp(wizardContext, 'site'), this.subscription);
    const client: SiteClient = await site.createClient(context);

    if (!client.isLinux) {
      try {
        await enableFileLogging(client);
      } catch (error) {
        context.telemetry.properties.fileLoggingError = parseError(error).message;
      }
    }

    return new ProductionSlotTreeItem(this, site);
  }

  public isAncestorOfImpl(contextValue: string | RegExp): boolean {
    return !isProjectCV(contextValue) || isRemoteProjectCV(contextValue);
  }
}

async function setRegionsTask(context: IFunctionAppWizardContext): Promise<void> {
  /* NOTE(psamband): To filter out georegions which only support WorkflowStandard we have to use 'ElasticPremium' as orgDomain
  since no new orgDomain is added for WorkflowStandard we will overwrite here so it filters region correctly. */
  const originalPlan = context.newPlanSku ? { ...context.newPlanSku } : undefined;

  context.newPlanSku = { tier: 'ElasticPremium' };
  context.newPlanSku = originalPlan;
}

export function setSiteOS(context: IAppServiceWizardContext): void {
  if (context.customLocation) {
    context.newSiteOS = WebsiteOS.linux;
  } else {
    context.newSiteOS = WebsiteOS.windows;
  }
}
