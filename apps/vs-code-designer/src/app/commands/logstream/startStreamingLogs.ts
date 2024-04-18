/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { enableFileLogging } from './enableFileLogging';
import type { ApplicationInsightsManagementClient, ApplicationInsightsComponent } from '@azure/arm-appinsights';
import type { SiteLogsConfig, StringDictionary } from '@azure/arm-appservice';
import * as appservice from '@microsoft/vscode-azext-azureappservice';
import type { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { createAppInsightsClient } from '@microsoft/vscode-azext-azureappservice';
import { DialogResponses, nonNullProp, openUrl } from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';

/**
 * Start streaming logs to remote app.
 * @param {IActionContext} context - Workflow file path.
 * @param {SlotTreeItem} treeItem - Logic app node structure.
 */
export async function startStreamingLogs(context: IActionContext, treeItem?: SlotTreeItem): Promise<void> {
  if (!treeItem) {
    treeItem = await ext.rgApi.pickAppResource<SlotTreeItem>(context, {
      filter: logicAppFilter,
    });
  }

  const site: ParsedSite = treeItem.site;

  if (site.isLinux) {
    try {
      await appservice.pingFunctionApp(context, site);
    } catch {
      // ignore and open portal anyways
    }

    await openLiveMetricsStream(context, site, treeItem);
  } else {
    const verifyLoggingEnabled: () => Promise<void> = async (): Promise<void> => {
      const client = await site.createClient(context);
      const logsConfig: SiteLogsConfig = await client.getLogsConfig();
      if (!isApplicationLoggingEnabled(logsConfig)) {
        const message: string = localize(
          'enableApplicationLogging',
          'Do you want to enable application logging for "{0}"?',
          client.fullName
        );
        await context.ui.showWarningMessage(message, { modal: true }, DialogResponses.yes, DialogResponses.cancel);
        await enableFileLogging(client, logsConfig);
      }
    };

    await appservice.startStreamingLogs(context, site, verifyLoggingEnabled, treeItem.logStreamLabel, treeItem.logStreamPath);
  }
}

/**
 * Linux Function Apps only support streaming through App Insights
 * For initial support, we will just open the "Live Metrics Stream" view in the portal
 */
async function openLiveMetricsStream(context: IActionContext, site: ParsedSite, node: AzExtTreeItem): Promise<void> {
  const client = await site.createClient(context);
  const appSettings: StringDictionary = await client.listApplicationSettings();
  const aiKey: string | undefined = appSettings.properties && appSettings.properties.APPINSIGHTS_INSTRUMENTATIONKEY;
  if (!aiKey) {
    // https://github.com/microsoft/vscode-azurefunctions/issues/1432
    throw new Error(localize('mustConfigureAI', 'You must configure Application Insights to stream logs on Linux Function Apps.'));
  }
  const aiClient: ApplicationInsightsManagementClient = await createAppInsightsClient([context, node]);
  const components = await aiClient.components.list();
  let component: ApplicationInsightsComponent | undefined = undefined;

  for await (const itemComponent of components) {
    if (itemComponent.instrumentationKey === aiKey) {
      component = itemComponent;
      break;
    }
  }

  if (!component) {
    throw new Error(localize('failedToFindAI', 'Failed to find application insights component.'));
  }
  const componentId: string = encodeURIComponent(
    JSON.stringify({
      Name: site.fullName,
      SubscriptionId: node.subscription.subscriptionId,
      ResourceGroup: site.resourceGroup,
    })
  );
  const resourceId: string = encodeURIComponent(nonNullProp(component, 'id'));

  const url = `${node.subscription.environment.portalUrl}/#blade/AppInsightsExtension/QuickPulseBladeV2/ComponentId/${componentId}/ResourceId/${resourceId}`;
  await openUrl(url);
}

function isApplicationLoggingEnabled(config: SiteLogsConfig): boolean {
  if (config.applicationLogs) {
    if (config.applicationLogs.fileSystem) {
      return config.applicationLogs.fileSystem.level !== undefined && config.applicationLogs.fileSystem.level.toLowerCase() !== 'off';
    }
    if (config.applicationLogs.azureBlobStorage) {
      return (
        config.applicationLogs.azureBlobStorage.level !== undefined && config.applicationLogs.azureBlobStorage.level.toLowerCase() !== 'off'
      );
    }
    if (config.applicationLogs.azureTableStorage) {
      return (
        config.applicationLogs.azureTableStorage.level !== undefined &&
        config.applicationLogs.azureTableStorage.level.toLowerCase() !== 'off'
      );
    }
  }

  return false;
}
