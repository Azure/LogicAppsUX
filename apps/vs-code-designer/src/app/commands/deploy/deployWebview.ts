import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';
import type * as vscode from 'vscode';
import { tryGetWebviewPanel } from '../../utils/codeless/common';
import { getAuthorizationToken } from '../../utils/codeless/getAuthorizationToken';
import { deploy } from './deploy';
import { createLogicAppWithoutWizard } from '../createLogicApp/createLogicApp';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { getWebLocations, AppKind } from '@microsoft/vscode-azext-azureappservice';

export async function deployViaWebview(context: IActionContext, target?: vscode.Uri): Promise<void> {
  // Get access token for Azure API calls
  const accessToken = await getAuthorizationToken();
  const cloudHost = (context as any).environment?.name || 'AzureCloud';

  await createWorkspaceWebviewCommandHandler({
    panelName: localize('deployToAzure', 'Deploy to Azure'),
    panelGroupKey: ext.webViewKey.deploy,
    projectName: ProjectName.deploy,
    createCommand: ExtensionCommand.deploy,
    createHandler: async (actionContext: IActionContext, data: any) => {
      if (data.createNew) {
        // User wants to create a new Logic App without wizard prompts
        const createContext: any = {
          ...actionContext,
          newSiteName: data.newLogicAppName,
          location: data.location,
          newResourceGroupName: data.isCreatingNewResourceGroup ? data.resourceGroup : undefined,
          resourceGroup: data.isCreatingNewResourceGroup ? undefined : { name: data.resourceGroup },
          newPlanName: data.isCreatingNewAppServicePlan ? data.appServicePlan : undefined,
          plan: data.isCreatingNewAppServicePlan ? undefined : { id: data.appServicePlan },
          appServicePlanSku: data.appServicePlanSku || 'WS1',
          newStorageAccountName: data.isCreatingNewStorageAccount ? data.storageAccount : undefined,
          storageAccount: data.isCreatingNewStorageAccount ? undefined : { id: data.storageAccount },
          createAppInsights: data.createAppInsights,
          newAppInsightsName: data.appInsightsName,
        };

        // Create the Logic App using the wizard-free method
        const node: SlotTreeItem = await createLogicAppWithoutWizard(
          createContext,
          data.subscriptionId,
          true // Skip notification since we're deploying next
        );

        // Now deploy to the newly created Logic App
        await deploy(actionContext, node.fullId, node.fullId);
      } else {
        // Deploy to existing Logic App
        await deploy(actionContext, data.logicAppId, data.logicAppId);
      }
    },
    extraHandlers: {
      [ExtensionCommand.cancel_deploy]: async () => {
        // Close the webview panel
        const existingPanel = tryGetWebviewPanel(ext.webViewKey.deploy, localize('deployToAzure', 'Deploy to Azure'));
        if (existingPanel) {
          existingPanel.dispose();
        }
      },
      [ExtensionCommand.getFilteredLocations]: async (message: any) => {
        ext.outputChannel.appendLine(`[DEBUG] getFilteredLocations handler called with data: ${JSON.stringify(message.data)}`);

        const panel = tryGetWebviewPanel(ext.webViewKey.deploy, localize('deployToAzure', 'Deploy to Azure'));
        if (!panel) {
          ext.outputChannel.appendLine('[DEBUG] Panel not found');
          return;
        }

        await callWithTelemetryAndErrorHandling('getFilteredLocations', async (actionContext: IActionContext) => {
          try {
            const subscriptionId = message.data?.subscriptionId;
            ext.outputChannel.appendLine(`[DEBUG] Subscription ID: ${subscriptionId}`);

            // Get filtered locations matching the Logic Apps requirements
            const wizardContext: any = {
              ...actionContext,
              subscriptionId: subscriptionId,
              newSiteKind: AppKind.workflowapp,
              newPlanSku: { tier: 'ElasticPremium' },
            };

            ext.outputChannel.appendLine('[DEBUG] Calling getWebLocations...');
            const locations = await getWebLocations(wizardContext);
            ext.outputChannel.appendLine(`[DEBUG] Got ${locations.length} locations`);

            const filteredLocations = locations.map((loc: any) => ({
              name: loc.name,
              displayName: loc.displayName,
            }));

            ext.outputChannel.appendLine(`[DEBUG] Sending response with ${filteredLocations.length} locations`);
            panel.webview.postMessage({
              command: 'getFilteredLocationsResult',
              locations: filteredLocations,
            });
          } catch (error) {
            ext.outputChannel.appendLine(`[DEBUG] Error: ${error}`);
            panel.webview.postMessage({
              command: 'getFilteredLocationsResult',
              error: (error as Error).message,
            });
          }
        });
      },
    },
    extraInitializeData: {
      deploymentFolderPath: ext.deploymentFolderPath || target?.fsPath,
      accessToken,
      cloudHost,
    },
  });
}
