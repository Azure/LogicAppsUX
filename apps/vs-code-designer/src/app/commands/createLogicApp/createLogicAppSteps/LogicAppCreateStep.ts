/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  azureWebJobsStorageKey,
  defaultVersionRange,
  extensionBundleId,
  extensionVersionKey,
  functionAppKind,
  logicAppKind,
  logicAppKindAppSetting,
  webhookRedirectHostUri,
  workerRuntimeKey,
} from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getStorageConnectionString } from '../../../utils/azure';
import { getRandomHexString } from '../../../utils/fs';
import { tryGetMajorVersion } from '../../../utils/funcCoreTools/funcVersion';
import type { NameValuePair, Site, SiteConfig, WebSiteManagementClient } from '@azure/arm-appservice';
import { Site as modelSite } from '@azure/arm-appservice/dist';
import { createWebSiteClient, WebsiteOS } from '@microsoft/vscode-azext-azureappservice';
import type { CustomLocation } from '@microsoft/vscode-azext-azureappservice';
import { LocationListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardExecuteStep, nonNullOrEmptyValue, nonNullProp } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext, ConnectionStrings } from '@microsoft/vscode-extension';
import { StorageOptions, FuncVersion, WorkerRuntime } from '@microsoft/vscode-extension';
import type { Progress } from 'vscode';

export class LogicAppCreateStep extends AzureWizardExecuteStep<ILogicAppWizardContext> {
  public priority = 140;

  public async execute(context: ILogicAppWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
    context.telemetry.properties.newSiteOS = context.newSiteOS;
    context.telemetry.properties.newSiteRuntime = context.newSiteRuntime;
    context.telemetry.properties.planSkuTier = context.plan?.sku?.tier;

    const message: string = localize('creatingNewApp', 'Creating new logic app "{0}"...', context.newSiteName);
    ext.outputChannel.appendLog(message);
    progress.report({ message });

    const client: WebSiteManagementClient = await createWebSiteClient(context);
    const siteName: string = nonNullProp(context, 'newSiteName');
    const rgName: string = nonNullProp(nonNullProp(context, 'resourceGroup'), 'name');

    context.site = await client.webApps.beginCreateOrUpdateAndWait(rgName, siteName, await this.getNewSite(context));
  }

  public shouldExecute(context: ILogicAppWizardContext): boolean {
    return !context.site;
  }

  private async getNewSite(context: ILogicAppWizardContext): Promise<Site> {
    const locationName: string = (await LocationListStep.getLocation(context))?.name;
    const site: Site = {
      name: context.newSiteName,
      kind: getSiteKind(context),
      location: locationName,
      serverFarmId: context.plan?.id,
      clientAffinityEnabled: false,
      siteConfig: await this.getNewSiteConfig(context),
      reserved: context.newSiteOS === WebsiteOS.linux,
      identity: context.customLocation ? undefined : { type: 'SystemAssigned' },
      managedEnvironmentId: context.useContainerApps ? context.containerApp?.id : undefined,
    } as Site;

    if (context.customLocation) {
      this.addCustomLocationProperties(site, context.customLocation);
    }

    return site;
  }

  private addCustomLocationProperties(site: Site, customLocation: CustomLocation): void {
    modelSite.type.modelProperties.extendedLocation = {
      serializedName: 'extendedLocation',
      type: {
        name: 'Composite',
        modelProperties: {
          name: {
            serializedName: 'name',
            type: {
              name: 'String',
            },
          },
          type: {
            serializedName: 'type',
            type: {
              name: 'String',
            },
          },
        },
      },
    };

    (site as any).extendedLocation = { name: customLocation.id, type: 'customLocation' };
  }

  private async getNewSiteConfig(context: ILogicAppWizardContext): Promise<SiteConfig> {
    const newSiteConfig: SiteConfig = {};
    if (context.newSiteOS === WebsiteOS.linux) {
      if (context.useConsumptionPlan) {
        newSiteConfig.use32BitWorkerProcess = false;
      }

      if (context.customLocation) {
        newSiteConfig.alwaysOn = true;
      }

      const linuxFxVersion: string = nonNullProp(context, 'newSiteRuntime');
      newSiteConfig.linuxFxVersion = linuxFxVersion;
    }

    if (context.useContainerApps) {
      newSiteConfig.linuxFxVersion = 'DOCKER|mcr.microsoft.com/azure-functions/dotnet:4-nightly';
    }

    newSiteConfig.appSettings = await this.getAppSettings(context);
    return newSiteConfig;
  }

  private async getAppSettings(context: ILogicAppWizardContext): Promise<NameValuePair[]> {
    const runtime: string = nonNullProp(context, 'newSiteRuntime');
    const runtimeWithoutVersion: string = getRuntimeWithoutVersion(runtime);

    const storageConnectionString: ConnectionStrings = await getStorageConnectionStrings(context);

    const appSettings: NameValuePair[] = [
      {
        name: extensionVersionKey,
        value: '~' + tryGetMajorVersion(context.version),
      },
      {
        name: workerRuntimeKey,
        value: runtimeWithoutVersion,
      },
      {
        name: webhookRedirectHostUri,
        value: '',
      },
    ];

    if (context.storageType === StorageOptions.SQL) {
      appSettings.push(
        {
          name: 'Workflows.Sql.ConnectionString',
          value: storageConnectionString.sqlConnectionStringValue,
        },
        {
          name: azureWebJobsStorageKey,
          value: storageConnectionString.azureWebJobsStorageKeyValue,
        }
      );
    } else {
      appSettings.push({
        name: azureWebJobsStorageKey,
        value: storageConnectionString.azureWebJobsStorageKeyValue,
      });
    }

    if (context.customLocation || context.useContainerApps) {
      appSettings.push(
        {
          name: 'APP_KIND',
          value: logicAppKindAppSetting,
        },
        {
          name: 'AzureFunctionsJobHost__extensionBundle__id',
          value: extensionBundleId,
        },
        {
          name: 'AzureFunctionsJobHost__extensionBundle__version',
          value: defaultVersionRange,
        }
      );
    }

    if (context.version === FuncVersion.v1) {
      appSettings.push({
        name: 'AzureWebJobsDashboard',
        value: storageConnectionString.azureWebJobsDashboardValue,
      });
    }

    if (
      context.newSiteOS === WebsiteOS.windows &&
      runtimeWithoutVersion.toLowerCase() === WorkerRuntime.Node &&
      context.version !== FuncVersion.v1
    ) {
      // Linux doesn't need this because it uses linuxFxVersion
      // v1 doesn't need this because it only supports one version of Node
      appSettings.push({
        name: 'WEBSITE_NODE_DEFAULT_VERSION',
        value: '~' + getRuntimeVersion(runtime),
      });
    }

    const isWorkflowStandard: boolean = context.plan?.sku?.family?.toLowerCase() === 'ws';
    if (context.newSiteOS === WebsiteOS.windows || isWorkflowStandard) {
      // WEBSITE_CONTENT* settings only apply for the following scenarios:
      // Windows: https://github.com/Microsoft/vscode-azurefunctions/issues/625
      // Linux Elastic Premium: https://github.com/microsoft/vscode-azurefunctions/issues/1682
      appSettings.push({
        name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING',
        value: storageConnectionString.websiteContentAzureFileValue,
      });
      appSettings.push({
        name: 'WEBSITE_CONTENTSHARE',
        value: getNewFileShareName(nonNullProp(context, 'newSiteName')),
      });
    }

    if (context.appInsightsComponent) {
      appSettings.push({
        name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
        value: context.appInsightsComponent.instrumentationKey,
      });
    }

    return appSettings;
  }
}

function getSiteKind(context: ILogicAppWizardContext): string {
  const kinds = [logicAppKind, functionAppKind];

  if (context.newSiteOS === WebsiteOS.linux) {
    kinds.push('linux');
  }

  if (context.customLocation) {
    kinds.push('kubernetes');
  }

  return kinds.join(',');
}

function getRuntimeWithoutVersion(runtime: string): string {
  return runtime.split('|')[0].trim();
}

function getRuntimeVersion(runtime: string): string {
  return nonNullOrEmptyValue(runtime.split('|')[1].trim(), 'runtimeVersion');
}

function getNewFileShareName(siteName: string): string {
  const randomLetters = 6;
  const maxFileShareNameLength = 63;
  return siteName.toLowerCase().substr(0, maxFileShareNameLength - randomLetters) + getRandomHexString(randomLetters);
}

async function getStorageConnectionStrings(context: ILogicAppWizardContext): Promise<ConnectionStrings> {
  const connectionStrings: ConnectionStrings = {
    sqlConnectionStringValue: '',
    azureWebJobsStorageKeyValue: '',
    azureWebJobsDashboardValue: '',
    websiteContentAzureFileValue: '',
  };

  const azureStorageConnectionString = (await getStorageConnectionString(context)).connectionString;

  if (context.customLocation) {
    if (context.storageType === StorageOptions.SQL) {
      connectionStrings.sqlConnectionStringValue = context.sqlConnectionString;
      connectionStrings.azureWebJobsStorageKeyValue = azureStorageConnectionString;
      connectionStrings.azureWebJobsDashboardValue = context.sqlConnectionString;
      connectionStrings.websiteContentAzureFileValue = context.sqlConnectionString;
    } else {
      connectionStrings.sqlConnectionStringValue = azureStorageConnectionString;
      connectionStrings.azureWebJobsStorageKeyValue = azureStorageConnectionString;
      connectionStrings.azureWebJobsDashboardValue = azureStorageConnectionString;
      connectionStrings.websiteContentAzureFileValue = azureStorageConnectionString;
    }
  } else {
    if (context.storageType === StorageOptions.SQL) {
      connectionStrings.sqlConnectionStringValue = context.sqlConnectionString;
      connectionStrings.azureWebJobsStorageKeyValue = azureStorageConnectionString;
      connectionStrings.azureWebJobsDashboardValue = azureStorageConnectionString;
      connectionStrings.websiteContentAzureFileValue = azureStorageConnectionString;
    } else {
      connectionStrings.sqlConnectionStringValue = context.sqlConnectionString;
      connectionStrings.azureWebJobsStorageKeyValue = azureStorageConnectionString;
      connectionStrings.azureWebJobsDashboardValue = azureStorageConnectionString;
      connectionStrings.websiteContentAzureFileValue = azureStorageConnectionString;
    }
  }
  return connectionStrings;
}
