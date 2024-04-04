/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LogicAppResolver } from '../../../LogicAppResolver';
import { projectLanguageSetting, workflowappRuntime } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { LogicAppCreateStep } from '../../commands/createLogicApp/createLogicAppSteps/LogicAppCreateStep';
import { LogicAppHostingPlanStep } from '../../commands/createLogicApp/createLogicAppSteps/LogicAppHostingPlanStep';
import { AzureStorageAccountStep } from '../../commands/deploy/storageAccountSteps/AzureStorageAccountStep';
import { CustomLocationStorageAccountStep } from '../../commands/deploy/storageAccountSteps/CustomLocationStorageAccountStep';
import { enableFileLogging } from '../../commands/logstream/enableFileLogging';
import { createActivityContext } from '../../utils/activityUtils';
import { verifyDeploymentResourceGroup } from '../../utils/codeless/common';
import { getRandomHexString } from '../../utils/fs';
import { getDefaultFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { isProjectCV, isRemoteProjectCV } from '../../utils/tree/projectContextValues';
import { getFunctionsWorkerRuntime, getWorkspaceSettingFromAnyFolder } from '../../utils/vsCodeConfig/settings';
import { LogicAppResourceTree } from '../LogicAppResourceTree';
import { SlotTreeItem } from '../slotsTree/SlotTreeItem';
import type { Site, WebSiteManagementClient } from '@azure/arm-appservice';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
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
  storageAccountNamingRules,
} from '@microsoft/vscode-azext-azureutils';
import type { AzExtTreeItem, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext } from '@microsoft/vscode-azext-utils';
import { nonNullProp, parseError, AzureWizard } from '@microsoft/vscode-azext-utils';
import type { IFunctionAppWizardContext, ICreateLogicAppContext } from '@microsoft/vscode-extension-logic-apps';
import { FuncVersion } from '@microsoft/vscode-extension-logic-apps';

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
        const resourceTree = new LogicAppResourceTree(this.subscription, site);
        if (resourceTree.site.isWorkflowApp) {
          return new SlotTreeItem(this, resourceTree);
        }
        return undefined;
      },
      (site: Site) => {
        return site.name;
      }
    );
  }
  public static async createChild(context: ICreateLogicAppContext, subscription: SubscriptionTreeItem): Promise<SlotTreeItem> {
    const version: FuncVersion = await getDefaultFuncVersion(context);
    const language: string | undefined = getWorkspaceSettingFromAnyFolder(projectLanguageSetting);

    context.telemetry.properties.projectRuntime = version;
    context.telemetry.properties.projectLanguage = language;

    const wizardContext: IFunctionAppWizardContext = Object.assign(context, subscription.subscription, {
      newSiteKind: AppKind.workflowapp,
      resourceGroupDeferLocationStep: true,
      version,
      language,
      newSiteRuntime: workflowappRuntime,
      ...(await createActivityContext()),
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

    wizardContext.activityTitle = localize(
      'logicAppCreateActivityTitle',
      'Creating Logic App "{0}"',
      nonNullProp(wizardContext, 'newSiteName')
    );

    context.telemetry.properties.os = wizardContext.newSiteOS;
    context.telemetry.properties.runtime = wizardContext.newSiteRuntime;

    if (!context.advancedCreation) {
      const baseName: string | undefined = await wizardContext.relatedNameTask;
      const newName = await generateRelatedName(wizardContext, baseName);
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

    const site = new ParsedSite(nonNullProp(wizardContext, 'site'), subscription.subscription);
    const client: SiteClient = await site.createClient(context);

    if (!client.isLinux) {
      try {
        await enableFileLogging(client);
      } catch (error) {
        context.telemetry.properties.fileLoggingError = parseError(error).message;
      }
    }

    const resolved = new LogicAppResourceTree(subscription.subscription, nonNullProp(wizardContext, 'site'));
    await LogicAppResolver.getSubscriptionSites(context, subscription.subscription);
    await ext.rgApi.appResourceTree.refresh(context);
    return new SlotTreeItem(subscription, resolved);
  }

  public isAncestorOfImpl(contextValue: string | RegExp): boolean {
    return !isProjectCV(contextValue) || isRemoteProjectCV(contextValue);
  }
}

async function setRegionsTask(context: IFunctionAppWizardContext): Promise<void> {
  /* To filter out georegions which only support WorkflowStandard we have to use 'ElasticPremium' as orgDomain
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

const generateRelatedName = async (wizardContext: IFunctionAppWizardContext, name: string): Promise<string | undefined> => {
  const namingRules = [storageAccountNamingRules];

  let preferredName: string = namingRules.some((n: any) => !!n.lowercaseOnly) ? name.toLowerCase() : name;

  for (let invalidCharsRegExp of namingRules.map((n: any) => n.invalidCharsRegExp)) {
    // Ensure the regExp uses the 'g' flag to replace _all_ invalid characters
    invalidCharsRegExp = new RegExp(invalidCharsRegExp, 'g');
    preferredName = preferredName.replace(invalidCharsRegExp, '');
  }

  if (await isRelatedNameAvailable(wizardContext, preferredName)) {
    return preferredName;
  }

  const minLength: number = Math.max(...namingRules.map((n: any) => n.minLength));
  const maxLength: number = Math.min(...namingRules.map((n: any) => n.maxLength));

  const maxTries = 5;
  let count = 0;
  let newName: string;
  while (count < maxTries) {
    newName = generateSuffixedName(preferredName, minLength, maxLength);
    if (await isRelatedNameAvailable(wizardContext, newName)) {
      return newName;
    }
    count += 1;
  }

  return undefined;
};

const isRelatedNameAvailable = async (wizardContext: IFunctionAppWizardContext, name: string): Promise<boolean> => {
  return await ResourceGroupListStep.isNameAvailable(wizardContext, name);
};

const generateSuffixedName = (preferredName: string, minLength: number, maxLength: number): string => {
  const suffix: string = getRandomHexString();
  const minUnsuffixedLength: number = minLength - suffix.length;
  const maxUnsuffixedLength: number = maxLength - suffix.length;

  let unsuffixedName: string = preferredName;
  if (unsuffixedName.length > maxUnsuffixedLength) {
    unsuffixedName = preferredName.slice(0, maxUnsuffixedLength);
  } else {
    while (unsuffixedName.length < minUnsuffixedLength) {
      unsuffixedName += preferredName;
    }
  }

  return unsuffixedName + suffix;
};
