/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  projectLanguageSetting,
  webProvider,
  workflowappRuntime,
  storageProvider,
  insightsProvider,
  useSmbDeployment,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import {
  AdvancedIdentityObjectIdStep,
  AdvancedIdentityClientIdStep,
  AdvancedIdentityTenantIdStep,
  AdvancedIdentityClientSecretStep,
} from '../../commands/createLogicApp/createLogicAppSteps/advancedIdentityPromptSteps';
import { ConnectEnvironmentStep } from '../../commands/createLogicApp/createLogicAppSteps/createHybridLogicAppSteps/connectEnvironmentStep';
import { HybridAppCreateStep } from '../../commands/createLogicApp/createLogicAppSteps/createHybridLogicAppSteps/hybridAppCreateStep';
import { LogicAppCreateStep } from '../../commands/createLogicApp/createLogicAppSteps/logicAppCreateStep';
import { LogicAppHostingPlanStep } from '../../commands/createLogicApp/createLogicAppSteps/logicAppHostingPlanStep';
import { AzureStorageAccountStep } from '../../commands/deploy/storageAccountSteps/AzureStorageAccountStep';
import { enableFileLogging } from '../../commands/logstream/enableFileLogging';
import { createActivityContext } from '../../utils/activityUtils';
import { createWebSiteClient } from '../../utils/azureClients';
import { verifyDeploymentResourceGroup } from '../../utils/codeless/common';
import { getRandomHexString } from '../../utils/fs';
import { getDefaultFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { isProjectCV, isRemoteProjectCV } from '../../utils/tree/projectContextValues';
import { getFunctionsWorkerRuntime, getWorkspaceSetting, getWorkspaceSettingFromAnyFolder } from '../../utils/vsCodeConfig/settings';
import { LogicAppResourceTree } from '../LogicAppResourceTree';
import { SlotTreeItem } from '../slotsTree/SlotTreeItem';
import type { Site, WebSiteManagementClient } from '@azure/arm-appservice';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import {
  AppInsightsCreateStep,
  AppInsightsListStep,
  AppKind,
  CustomLocationListStep,
  ParsedSite,
  SiteNameStep,
  WebsiteOS,
  getWebLocations,
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
import type { ILogicAppWizardContext, ICreateLogicAppContext, IIdentityWizardContext } from '@microsoft/vscode-extension-logic-apps';
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
      }
      throw error;
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

    const wizardContext: ILogicAppWizardContext = Object.assign(context, subscription.subscription, {
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

    const locations = await getWebLocations({ ...wizardContext, newPlanSku: wizardContext.newPlanSku ?? { tier: 'ElasticPremium' } });
    CustomLocationListStep.setLocationSubset(wizardContext, Promise.resolve(locations), 'microsoft.resources');
    CustomLocationListStep.addStep(context as any, promptSteps);
    promptSteps.push(new LogicAppHostingPlanStep());

    const storageAccountCreateOptions: INewStorageAccountDefaults = {
      kind: StorageAccountKind.Storage,
      performance: StorageAccountPerformance.Standard,
      replication: StorageAccountReplication.LRS,
    };

    if (context.advancedCreation) {
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
    } else {
      wizardContext.runtimeFilter = getFunctionsWorkerRuntime(language);
    }

    const title: string = localize('functionAppCreatingTitle', 'Create new Logic App (Standard) in Azure');
    const wizard: AzureWizard<IAppServiceWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title });

    await wizard.prompt();

    if (wizardContext.useHybrid) {
      wizardContext.isCreate = true;
      if (!getWorkspaceSetting<boolean>(useSmbDeployment)) {
        const identityWizardContext: IIdentityWizardContext = {
          clientId: undefined,
          clientSecret: undefined,
          objectId: undefined,
          tenantId: undefined,
          useAdvancedIdentity: undefined,
          ...context,
        };

        const identityWizard: AzureWizard<IIdentityWizardContext> = new AzureWizard(identityWizardContext, {
          promptSteps: [
            new AdvancedIdentityObjectIdStep(),
            new AdvancedIdentityClientIdStep(),
            new AdvancedIdentityTenantIdStep(),
            new AdvancedIdentityClientSecretStep(),
          ],
          title: localize('aadDetails', 'Provide your AAD identity details to use for deployment.'),
        });
        await identityWizard.prompt();

        wizardContext.aad = {
          clientId: identityWizardContext.clientId,
          clientSecret: identityWizardContext.clientSecret,
          objectId: identityWizardContext.objectId,
          tenantId: identityWizardContext.tenantId,
        };
      }

      executeSteps.push(new ConnectEnvironmentStep());
      executeSteps.push(new HybridAppCreateStep());
    } else {
      executeSteps.push(new StorageAccountCreateStep(storageAccountCreateOptions));
      executeSteps.push(new AppInsightsCreateStep());
      executeSteps.push(new VerifyProvidersStep([webProvider, storageProvider, insightsProvider]));
      executeSteps.push(new LogicAppCreateStep());
    }

    if (wizardContext.customLocation && !wizardContext.useHybrid) {
      setSiteOS(wizardContext);
      executeSteps.pop();
    }

    wizardContext.activityTitle = localize(
      'logicAppCreateActivityTitle',
      'Creating Logic App "{0}"',
      nonNullProp(wizardContext, 'newSiteName')
    );

    context.telemetry.properties.os = wizardContext.newSiteOS;
    context.telemetry.properties.runtime = wizardContext.newSiteRuntime;

    if (!context.advancedCreation && !wizardContext.useHybrid) {
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

    // TODO (ccastrotrejo): Revisit this as the azureappservice library gets updated in the future
    // Patch: Ensure newAppInsightsName is not null/undefined to prevent nonNullProp errors
    if (!wizardContext.newAppInsightsName) {
      wizardContext.newAppInsightsName = '';
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
    let resolved: LogicAppResourceTree | null = null;

    if (!wizardContext.useHybrid) {
      const site = new ParsedSite(nonNullProp(wizardContext, 'site'), subscription.subscription);
      const client: SiteClient = await site.createClient(context);

      if (!client.isLinux) {
        try {
          await enableFileLogging(client);
        } catch (error) {
          context.telemetry.properties.fileLoggingError = parseError(error).message;
        }
      }

      resolved = new LogicAppResourceTree(subscription.subscription, nonNullProp(wizardContext, 'site'));
      const logicAppMap = ext.subscriptionLogicAppMap.get(subscription.subscription.subscriptionId);
      if (logicAppMap) {
        logicAppMap.set(wizardContext.site.id.toLowerCase(), wizardContext.site);
      }
      await ext.rgApi.appResourceTree.refresh(context);
    }

    const slotTreeItem = new SlotTreeItem(subscription, resolved, {
      isHybridLogiApp: wizardContext.useHybrid,
      hybridSite: wizardContext.hybridSite,
      location: wizardContext.customLocation
        ? wizardContext.customLocation.kubeEnvironment.location.replace(/[()]/g, '')
        : wizardContext._location.name,
      fileShare: wizardContext.fileShare,
      connectedEnvironment: wizardContext.connectedEnvironment,
      resourceGroupName: wizardContext.resourceGroup.name,
      sqlConnectionString: wizardContext.sqlConnectionString,
    });
    return slotTreeItem;
  }

  public isAncestorOfImpl(contextValue: string | RegExp): boolean {
    return !isProjectCV(contextValue) || isRemoteProjectCV(contextValue);
  }
}

async function setRegionsTask(context: ILogicAppWizardContext): Promise<void> {
  /* To filter out georegions which only support WorkflowStandard we have to use 'ElasticPremium' as orgDomain
  since no new orgDomain is added for WorkflowStandard we will overwrite here so it filters region correctly. */
  const originalPlan = context.newPlanSku ? { ...context.newPlanSku } : undefined;

  context.newPlanSku = originalPlan;
}

export function setSiteOS(context: IAppServiceWizardContext): void {
  if (context.customLocation) {
    context.newSiteOS = WebsiteOS.linux;
  } else {
    context.newSiteOS = WebsiteOS.windows;
  }
}

const generateRelatedName = async (wizardContext: ILogicAppWizardContext, name: string): Promise<string | undefined> => {
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

const isRelatedNameAvailable = async (wizardContext: ILogicAppWizardContext, name: string): Promise<boolean> => {
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
