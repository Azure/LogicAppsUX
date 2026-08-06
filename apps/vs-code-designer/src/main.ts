import './nodeUtilCompatibility';
import { LogicAppResolver } from './LogicAppResolver';
import { registerCommands } from './app/commands/registerCommands';
import { getResourceGroupsApi } from './app/resourcesExtension/getExtensionApi';
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { downloadExtensionBundle } from './app/utils/bundleFeed';
import {
  promptStartDesignTimeOption,
  scheduleStartAllDesignTimeApis,
  stopAllDesignTimeApis,
} from './app/utils/codeless/startDesignTimeApi';
import { UriHandler } from './app/utils/codeless/urihandler';
import { getExtensionVersion, initializeCustomExtensionContext, updateLogicAppsContext } from './app/utils/extension';
import { registerFuncHostTaskEvents } from './app/utils/funcCoreTools/funcHostTask';
import { shouldRequireStrictDependencyValidation } from './app/utils/strictDependencyValidation';
import { ensureVSCodeFiles } from './app/projectConsistency/vscodeConsistency';
import { tryGetLogicAppProjectRoot } from './app/utils/verifyIsProject';
import {
  DependencyDefaultPath,
  dotNetBinaryPathSettingKey,
  extensionCommand,
  extensionContext,
  funcCoreToolsBinaryPathSettingKey,
  logicAppFilter,
  nodeJsBinaryPathSettingKey,
  parameterizeConnectionsInProjectLoadSetting,
} from './constants';
import { ext } from './extensionVariables';
import { registerAppServiceExtensionVariables } from '@microsoft/vscode-azext-azureappservice';
import {
  callWithTelemetryAndErrorHandling,
  createAzExtOutputChannel,
  DialogResponses,
  registerEvent,
  registerUIExtensionVariables,
} from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ensureWorkspace } from './app/commands/ensureWorkspace';
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
import { enableLocalManagedIdentityAuth } from './app/utils/managedIdentity';
import { localize } from './localize';
import { isDevContainerWorkspace } from './app/utils/devContainerUtils';
import { parameterizeAllConnections } from './app/commands/parameterizeConnections';
import { isManagedIdentityAuthEnabled, shouldParameterizeConnections, updateGlobalSetting } from './app/utils/vsCodeConfig/settings';
import {
  isManagedIdentityAuthNotificationSuppressed,
  isParameterizeConnectionsNotificationSuppressed,
  suppressManagedIdentityAuthNotification,
  suppressParameterizeConnectionsNotification,
} from './app/state/notifications';
import { useBinariesDependencies } from './app/utils/binaries';
import { validateAndInstallBinaries } from './app/commands/binaries/validateAndInstallBinaries';

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
    activateContext.telemetry.properties.isActivationEvent = 'true';
    vscode.commands.executeCommand(
      'setContext',
      extensionContext.customCodeFunctionsFolders,
      await getAllCustomCodeFunctionsProjects(activateContext)
    );

    runPostExtractStepsFromCache();
    callWithTelemetryAndErrorHandling('activate.logSubscriptions', async (actionContext: IActionContext) => {
      actionContext.telemetry.properties.isActivationEvent = 'true';
      await logSubscriptions(actionContext);
    });

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      activateContext.telemetry.properties.lastStep = 'ensureWorkspace';
      await callWithTelemetryAndErrorHandling('activate.ensureWorkspace', async (actionContext: IActionContext) => {
        actionContext.errorHandling.rethrow = true;
        actionContext.errorHandling.suppressDisplay = true;
        await ensureWorkspace(actionContext);
      });

      activateContext.telemetry.properties.lastStep = 'parameterizeConnections';
      callWithTelemetryAndErrorHandling('activate.parameterizeAllConnections', async (actionContext: IActionContext) => {
        actionContext.telemetry.properties.isActivationEvent = 'true';
        if (shouldParameterizeConnections() || (await promptShouldParameterizeConnections(actionContext))) {
          await parameterizeAllConnections(actionContext);
        }
      });
    }

    activateContext.telemetry.properties.lastStep = 'promptEnableManagedIdentityAuth';
    promptEnableLocalManagedIdentityAuth().catch((error) => {
      ext.outputChannel?.appendLog(
        localize(
          'managedIdentityAuthPromptFailed',
          `Managed identity auth startup prompt failed: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    });

    activateContext.telemetry.properties.lastStep = 'ensureExtensionBundle';
    await ensureExtensionBundle();

    activateContext.telemetry.properties.lastStep = 'isDevContainerWorkspace';
    const isDevContainer = await isDevContainerWorkspace();
    activateContext.telemetry.properties.isDevContainer = String(isDevContainer);

    activateContext.telemetry.properties.lastStep = 'ensureBinaries';
    await ensureBinaries(activateContext, isDevContainer);

    activateContext.telemetry.properties.lastStep = 'ensureDesignTimeApi';
    await ensureDesignTimeApi(activateContext, isDevContainer);

    activateContext.telemetry.properties.lastStep = 'startLanguageServer';
    const hasCodefulProjects = await codefulProjectsExist();
    if (hasCodefulProjects) {
      startLanguageServer();
    }

    ext.rgApi = await getResourceGroupsApi();
    // @ts-expect-error _rootTreeItem does not exist on type AzExtTreeDataProvider
    ext.azureAccountTreeItem = ext.rgApi.appResourceTree._rootTreeItem as AzureAccountTreeItemWithProjects;

    // TODO(aeldridge): This was added to avoid behavior change after modifying .vscode config validation to not set
    // ext.defaultLogicAppPath. This should be revisited - a default logic app shouldn't be needed in ext context.
    activateContext.telemetry.properties.lastStep = 'setDefaultLogicAppPath';
    if (vscode.workspace.workspaceFolders) {
      for (const folder of vscode.workspace.workspaceFolders) {
        const projectPath = await tryGetLogicAppProjectRoot(activateContext, folder, true);
        if (projectPath) {
          ext.defaultLogicAppPath = projectPath;
          break;
        }
      }
    }

    activateContext.telemetry.properties.lastStep = 'ensureVSCodeFiles';
    callWithTelemetryAndErrorHandling('activate.ensureVSCodeFiles', async (actionContext: IActionContext) => {
      await ensureVSCodeFiles(actionContext);
    });

    activateContext.telemetry.properties.lastStep = 'registerEvent';
    registerEvent(
      'azureLogicAppsStandard.onDidChangeWorkspaceFolders',
      vscode.workspace.onDidChangeWorkspaceFolders,
      async (actionContext: IActionContext) => {
        await ensureVSCodeFiles(actionContext);
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

    logExtensionSettings(activateContext);
  });
}

async function promptShouldParameterizeConnections(context: IActionContext): Promise<boolean> {
  if (isParameterizeConnectionsNotificationSuppressed()) {
    return false;
  }

  const message = localize('allowParameterizeConnections', 'Allow parameterization for connections when your project loads?');
  const result = await vscode.window.showInformationMessage(
    message,
    DialogResponses.yes,
    DialogResponses.no,
    DialogResponses.dontWarnAgain
  );
  if (result === DialogResponses.yes) {
    await updateGlobalSetting(parameterizeConnectionsInProjectLoadSetting, true);
    context.telemetry.properties.parameterizeConnectionsInProjectLoadSetting = 'true';
    return true;
  }

  if (result === DialogResponses.dontWarnAgain) {
    await suppressParameterizeConnectionsNotification();
    context.telemetry.properties.parameterizeConnectionsInProjectLoadSetting = 'suppressed';
  }

  return false;
}

/**
 * Shows a non-blocking information message on startup prompting the user to enable local managed identity
 * authentication for local workflows. The notification is suppressed if:
 * - The user has already enabled the setting.
 * - The user previously selected "Don't show again".
 */
async function promptEnableLocalManagedIdentityAuth(): Promise<void> {
  if (isManagedIdentityAuthNotificationSuppressed() || isManagedIdentityAuthEnabled()) {
    return;
  }

  const enableButton = localize('enable', 'Enable');
  const closeButton = localize('close', 'Close');
  const dontShowAgain = localize('dontShowAgain', "Don't show again");
  const message = localize('managedIdentityAuthAvailable', 'Managed identity authentication for local workflows is now supported.');

  const selection = await vscode.window.showInformationMessage(message, enableButton, closeButton, dontShowAgain);

  if (selection === enableButton) {
    await callWithTelemetryAndErrorHandling('activate.enableLocalManagedIdentityAuth', async (actionContext: IActionContext) => {
      actionContext.telemetry.properties.isActivationEvent = 'true';
      await enableLocalManagedIdentityAuth(actionContext);
    });
  } else if (selection === dontShowAgain) {
    await suppressManagedIdentityAuthNotification();
  }
}

async function ensureExtensionBundle(): Promise<void> {
  if (shouldRequireStrictDependencyValidation()) {
    await callWithTelemetryAndErrorHandling('activate.downloadExtensionBundle', async (actionContext: IActionContext) => {
      actionContext.telemetry.properties.isActivationEvent = 'true';
      actionContext.errorHandling.rethrow = true;
      actionContext.errorHandling.suppressDisplay = true;
      await downloadExtensionBundle(actionContext);
    });
  } else {
    callWithTelemetryAndErrorHandling('activate.downloadExtensionBundle', async (actionContext: IActionContext) => {
      actionContext.telemetry.properties.isActivationEvent = 'true';
      await downloadExtensionBundle(actionContext).catch((error) => {
        ext.outputChannel?.appendLog(
          localize(
            'bundleDownloadFailed',
            `Background extension-bundle download failed: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      });
    });
  }
}

async function ensureBinaries(activateContext: IActionContext, isDevContainer: boolean): Promise<void> {
  if (isDevContainer) {
    activateContext.telemetry.properties.skippedDependencyOnboarding = 'true';
    activateContext.telemetry.properties.skippedDependencyOnboardingReason = 'devContainer';
    ext.outputChannel?.appendLog(
      localize(
        'devContainerDetected',
        'Devcontainer workspace detected. Skipping dependency onboarding and auto-starting design time APIs.'
      )
    );
  } else {
    const useBinaries = await useBinariesDependencies();

    if (useBinaries) {
      await callWithTelemetryAndErrorHandling('activate.validateAndInstallBinaries', async (actionContext: IActionContext) => {
        actionContext.telemetry.properties.isActivationEvent = 'true';
        if (shouldRequireStrictDependencyValidation()) {
          actionContext.errorHandling.rethrow = true;
          actionContext.errorHandling.suppressDisplay = true;
        }

        await validateAndInstallBinaries(actionContext);
      });

      activateContext.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting = 'true';
    } else {
      await updateGlobalSetting(dotNetBinaryPathSettingKey, DependencyDefaultPath.dotnet);
      await updateGlobalSetting(nodeJsBinaryPathSettingKey, DependencyDefaultPath.node);
      await updateGlobalSetting(funcCoreToolsBinaryPathSettingKey, DependencyDefaultPath.funcCoreTools);
      activateContext.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting = 'false';
    }
  }
}

async function ensureDesignTimeApi(activateContext: IActionContext, isDevContainer: boolean): Promise<void> {
  if (isDevContainer) {
    activateContext.telemetry.properties.designTimeStartupMode = 'devContainerAutoStart';
    activateContext.telemetry.properties.designTimeStartupState = 'scheduled';
    ext.outputChannel?.appendLog(
      localize('schedulingDesignTimeStartup', 'Scheduling background design-time startup for devcontainer workspace.')
    );
    scheduleStartAllDesignTimeApis();
  } else {
    await promptStartDesignTimeOption(activateContext);
  }
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
