/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Site, WebSiteManagementClient } from '@azure/arm-appservice';
import { AppInsightsCreateStep, AppInsightsListStep, AppKind, AppServicePlanCreateStep, createWebSiteClient, CustomLocationListStep, IAppServiceWizardContext, ParsedSite, SiteClient, SiteNameStep, WebsiteOS } from '@microsoft/vscode-azext-azureappservice';
import { INewStorageAccountDefaults, ResourceGroupListStep, StorageAccountCreateStep, StorageAccountKind, StorageAccountListStep, StorageAccountPerformance, StorageAccountReplication, SubscriptionTreeItemBase, uiUtils, VerifyProvidersStep } from '@microsoft/vscode-azext-azureutils';
import { AzExtTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext, ICreateChildImplContext, nonNullProp, parseError } from '@microsoft/vscode-azext-utils';
import { funcVersionSetting, logicAppKind, projectLanguageSetting, workflowappRuntime } from '../../constants';
import { ext } from '../../extensionVariables';
import { tryGetLocalFuncVersion } from '../utils/funcCoreTools/tryGetLocalFuncVersion';
import { localize } from "../../localize";
import { ProductionSlotTreeItem } from './ProductionSlotTreeItem';
import { isProjectCV, isRemoteProjectCV } from './projectContextValues';
import { FuncVersion, IFunctionAppWizardContext, latestGAVersion } from '@microsoft-logic-apps/utils';
import { tryParseFuncVersion } from '../utils/funcCoreTools/funcVersion';
import { getFunctionsWorkerRuntime, getWorkspaceSettingFromAnyFolder } from '../utils/vsCodeConfig/settings';
import { verifyDeploymentResourceGroup } from '../utils/codeless/common';

export interface ICreateFuntionAppContext extends ICreateChildImplContext {
    newResourceGroupName?: string;
}

export class SubscriptionTreeItem extends SubscriptionTreeItemBase {
    public readonly childTypeLabel: string = localize('LogicApp', 'Logic App (Standard) in Azure');
    public supportsAdvancedCreation: boolean = true;

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
                if (site.kind!.includes(logicAppKind)) {
                    return new ProductionSlotTreeItem(this, parsedSite);
                }
                return undefined;
            },
            (site: Site) => {
                return site.name;
            }
        );
    }

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
            newSiteRuntime: workflowappRuntime
        });

       /* if (version === FuncVersion.v1) { // v1 doesn't support linux
            wizardContext.newSiteOS = WebsiteOS.windows;
        }

        await setRegionsTask(wizardContext);

        const promptSteps: AzureWizardPromptStep<IAppServiceWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IAppServiceWizardContext>[] = [];
        promptSteps.push(new SiteNameStep());
        CustomLocationListStep.addStep(context as any, promptSteps);
        //promptSteps.push(new FunctionAppHostingPlanStep());
        promptSteps.push(new ResourceGroupListStep()); // not present

        const storageAccountCreateOptions: INewStorageAccountDefaults = {
            kind: StorageAccountKind.Storage,
            performance: StorageAccountPerformance.Standard,
            replication: StorageAccountReplication.LRS
        };

        if (!context.advancedCreation) {
            wizardContext.runtimeFilter = getFunctionsWorkerRuntime(language);
            executeSteps.push(new StorageAccountCreateStep(storageAccountCreateOptions));
            executeSteps.push(new AppInsightsCreateStep());
        } else {
            if (wizardContext.customLocation) {
                //promptSteps.push(new CustomLocationStorageAccountStep(context));
            } else {
                promptSteps.push(new StorageAccountListStep(
                    storageAccountCreateOptions,
                    {
                        kind: [
                            StorageAccountKind.BlobStorage
                        ],
                        performance: [
                            StorageAccountPerformance.Premium
                        ],
                        replication: [
                            StorageAccountReplication.ZRS
                        ],
                        learnMoreLink: 'https://aka.ms/Cfqnrc'
                    }
                ));
                //promptSteps.push(new AzureStorageAccountStep());
                promptSteps.push(new AppInsightsListStep());
            }
        }

        executeSteps.push(new VerifyProvidersStep(['Microsoft.Web', 'Microsoft.Storage', 'Microsoft.Insights']));
        //executeSteps.push(new LogicAppCreateStep());

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
                throw new Error(localize('noUniqueName', 'Failed to generate unique name for resources. Use advanced creation to manually enter resource names.'));
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

        

        if (!client.isLinux) { // not supported on linux
            try {
                //await enableFileLogging(client);
            } catch (error) {
                // optional part of creating function app, so not worth blocking on error
                context.telemetry.properties.fileLoggingError = parseError(error).message;
            }
        }
        */
        const site = new ParsedSite(nonNullProp(wizardContext, 'site'), this.subscription);
        const client: SiteClient = await site.createClient(context);
        return new ProductionSlotTreeItem(this, site);
    }

    public isAncestorOfImpl(contextValue: string | RegExp): boolean {
        return !isProjectCV(contextValue) || isRemoteProjectCV(contextValue);
    }
}

export function setSiteOS(context: IAppServiceWizardContext): void {
    if (context.customLocation) {
        context.newSiteOS = WebsiteOS.linux;
    } else {
        context.newSiteOS = WebsiteOS.windows;
    }
}

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

async function setRegionsTask(context: IFunctionAppWizardContext): Promise<void> {
    // NOTE(psamband): To filter out georegions which only support WorkflowStandard we have to use 'ElasticPremium' as orgDomain
    // since no new orgDomain is added for WorkflowStandard we will overwrite here so it filters region correctly.
    const originalPlan = context.newPlanSku ? { ...context.newPlanSku } : undefined;
    context.newPlanSku = { tier: 'ElasticPremium' };

    context.newPlanSku = originalPlan;
}

