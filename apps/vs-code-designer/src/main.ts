import './nodeUtilCompatibility';
import { LogicAppResolver } from './LogicAppResolver';
import { parameterizeConnectionsIfNeeded } from './app/commands/parameterizeConnections';
import { registerCommands } from './app/commands/registerCommands';
import { getResourceGroupsApi } from './app/resourcesExtension/getExtensionApi';
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { downloadExtensionBundle } from './app/utils/bundleFeed';
import { stopAllDesignTimeApis } from './app/utils/codeless/startDesignTimeApi';
import { UriHandler } from './app/utils/codeless/urihandler';
import { getExtensionVersion, initializeCustomExtensionContext, updateLogicAppsContext } from './app/utils/extension';
import { registerFuncHostTaskEvents } from './app/utils/funcCoreTools/funcHostTask';
import { shouldRequireStrictDependencyValidation } from './app/utils/strictDependencyValidation';
import { verifyVSCodeConfigOnActivate } from './app/utils/vsCodeConfig/verifyVSCodeConfigOnActivate';
import { extensionCommand, logicAppFilter } from './constants';
import { ext } from './extensionVariables';
import { startOnboarding } from './onboarding';
import { registerAppServiceExtensionVariables } from '@microsoft/vscode-azext-azureappservice';
import {
  callWithTelemetryAndErrorHandling,
  createAzExtOutputChannel,
  registerEvent,
  registerUIExtensionVariables,
} from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { convertToWorkspace } from './app/commands/convertToWorkspace';
import TelemetryReporter from '@vscode/extension-telemetry';
import { getAllCustomCodeFunctionsProjects } from './app/utils/customCodeUtils';
import { createVSCodeAzureSubscriptionProvider } from './app/utils/services/VSCodeAzureSubscriptionProvider';
import { logExtensionSettings, logSubscriptions } from './app/utils/telemetry';
import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';
import { getAzExtResourceType, getAzureResourcesExtensionApi } from '@microsoft/vscode-azureresources-api';
import { startLanguageServer } from './app/languageServer/languageServer';
import { runPostExtractStepsFromCache } from './app/utils/cloudToLocalUtils';
import { codefulProjectsExist } from './app/utils/codeful';
import { logicAppDebugConfigProvider } from './app/utils/debug';
import { promptManagedIdentityAuth } from './app/utils/managedIdentityNotification';

const perfStats = {
  loadStartTime: Date.now(),
  loadEndTime: undefined as number | undefined,
};

const telemetryString = 'setInGitHubBuild';

export async function activate(context: vscode.ExtensionContext) {
  initializeCustomExtensionContext();
  await updateLogicAppsContext();

  const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    updateLogicAppsContext();
  });
  context.subscriptions.push(workspaceWatcher);

  vscode.debug.registerDebugConfigurationProvider('logicapp', logicAppDebugConfigProvider);

  ext.context = context;
  ext.extensionVersion = getExtensionVersion();
  ext.telemetryReporter = new TelemetryReporter(telemetryString);
  context.subscriptions.push(ext.telemetryReporter);

  ext.subscriptionProvider = createVSCodeAzureSubscriptionProvider();
  ext.outputChannel = createAzExtOutputChannel('Azure Logic Apps (Standard)', ext.prefix);

  registerUIExtensionVariables(ext);
  registerAzureUtilsExtensionVariables(ext);
  registerAppServiceExtensionVariables(ext);

  await callWithTelemetryAndErrorHandling(extensionCommand.activate, async (activateContext: IActionContext) => {
    vscode.commands.executeCommand(
      'setContext',
      extensionCommand.customCodeSetFunctionsFolders,
      await getAllCustomCodeFunctionsProjects(activateContext)
    );

    activateContext.telemetry.properties.isActivationEvent = 'true';
    runPostExtractStepsFromCache();
    callWithTelemetryAndErrorHandling(extensionCommand.logSubscriptions, async (actionContext: IActionContext) => {
      await logSubscriptions(actionContext);
    });

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      await convertToWorkspace(activateContext);
    }

    if (shouldRequireStrictDependencyValidation()) {
      await downloadExtensionBundle(activateContext);
    } else {
      // Intentionally not awaited so activation stays snappy. Downstream code
      // that depends on the extracted bundle (startDesignTimeApi) calls
      // waitForExtensionBundleReady() to block on the in-flight work and avoid
      // racing the re-extract — which on Windows can lock the bundle folder and
      // leave the design-time host pointing at a half-extracted bundle.
      downloadExtensionBundle(activateContext).catch((error) => {
        ext.outputChannel?.appendLog(
          `Background extension-bundle download failed: ${error instanceof Error ? error.message : String(error)}`
        );
      });
    }
    parameterizeConnectionsIfNeeded(activateContext, false);
    await startOnboarding(activateContext);

    const hasCodefulProjects = await codefulProjectsExist();
    if (hasCodefulProjects) {
      startLanguageServer();
    }

    promptManagedIdentityAuth(activateContext);

    ext.rgApi = await getResourceGroupsApi();
    // @ts-expect-error _rootTreeItem does not exist on type AzExtTreeDataProvider
    ext.azureAccountTreeItem = ext.rgApi.appResourceTree._rootTreeItem as AzureAccountTreeItemWithProjects;

    activateContext.telemetry.properties.lastStep = 'verifyVSCodeConfigOnActivate';
    callWithTelemetryAndErrorHandling(extensionCommand.validateLogicAppProjects, async (actionContext: IActionContext) => {
      await verifyVSCodeConfigOnActivate(actionContext, vscode.workspace.workspaceFolders);
    });

    activateContext.telemetry.properties.lastStep = 'registerEvent';
    registerEvent(
      extensionCommand.validateLogicAppProjects,
      vscode.workspace.onDidChangeWorkspaceFolders,
      async (actionContext: IActionContext, event: vscode.WorkspaceFoldersChangeEvent) => {
        await verifyVSCodeConfigOnActivate(actionContext, event.added);
      }
    );

    context.subscriptions.push(ext.outputChannel);
    context.subscriptions.push(ext.azureAccountTreeItem);

    activateContext.telemetry.properties.lastStep = 'registerCommands';
    registerCommands();
    activateContext.telemetry.properties.lastStep = 'registerFuncHostTaskEvents';
    registerFuncHostTaskEvents();

    ext.rgApi.registerApplicationResourceResolver(getAzExtResourceType(logicAppFilter)!, new LogicAppResolver());
    const azureResourcesApi = await getAzureResourcesExtensionApi(context, '2.0.0');
    ext.rgApiV2 = azureResourcesApi;

    vscode.window.registerUriHandler(new UriHandler());
    perfStats.loadEndTime = Date.now();
    activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

    logExtensionSettings(activateContext);
  });
}

export async function deactivate(): Promise<void> {
  await stopAllDesignTimeApis();
  try {
    await ext.languageClient?.stop();
  } finally {
    ext.languageClient = undefined;
    ext.telemetryReporter.dispose();
  }
}
