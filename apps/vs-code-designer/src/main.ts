import './nodeUtilCompatibility';
import { LogicAppResolver } from './LogicAppResolver';
import { registerCommands } from './app/commands/registerCommands';
import { getResourceGroupsApi } from './app/resourcesExtension/getExtensionApi';
import type { AzureAccountTreeItemWithProjects } from './app/tree/AzureAccountTreeItemWithProjects';
import { downloadExtensionBundle } from './app/utils/bundleFeed';
import {
  scheduleStartAllDesignTimeApis,
  stopAllDesignTimeApis,
  startDesignTimeApi,
} from './app/utils/codeless/startDesignTimeApi';
import { UriHandler } from './app/utils/codeless/urihandler';
import { getExtensionVersion, initializeCustomExtensionContext, updateLogicAppsContext } from './app/utils/extension';
import { registerFuncHostTaskEvents } from './app/utils/funcCoreTools/funcHostTask';
import { shouldRequireStrictDependencyValidation } from './app/utils/strictDependencyValidation';
import { ensureVSCodeFiles } from './app/projectConsistency/vscodeConsistency';
import {
  autoStartDesignTimeSetting,
  DependencyDefaultPath,
  dotNetBinaryPathSettingKey,
  extensionCommand,
  extensionEvent,
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
import { createVSCodeAzureSubscriptionProvider } from './app/utils/services/VSCodeAzureSubscriptionProvider';
import { logExtensionSettings, logSubscriptions } from './app/utils/telemetry';
import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';
import { getAzExtResourceType, getAzureResourcesExtensionApi } from '@microsoft/vscode-azureresources-api';
import { startLanguageServers } from './app/languageServer/languageServer';
import { runPostExtractStepsFromCache } from './app/utils/cloudToLocalUtils';
import { codefulProjectExists } from './app/utils/codeful';
import { logicAppDebugConfigProvider } from './app/utils/debug';
import { enableLocalManagedIdentityAuth } from './app/utils/managedIdentity';
import { localize } from './localize';
import { isDevContainerWorkspace } from './app/utils/devContainerUtils';
import { parameterizeAllConnections } from './app/commands/parameterizeConnections';
import { getWorkspaceSetting, isManagedIdentityAuthEnabled, shouldParameterizeConnections, updateGlobalSetting } from './app/utils/vsCodeConfig/settings';
import {
  isAutoStartDesignTimeNotificationSuppressed,
  isManagedIdentityAuthNotificationSuppressed,
  isParameterizeConnectionsNotificationSuppressed,
  suppressAutoStartDesignTimeNotification,
  suppressManagedIdentityAuthNotification,
  suppressParameterizeConnectionsNotification,
} from './app/state/notifications';
import { useBinariesDependencies } from './app/utils/binaries';
import { validateAndInstallBinaries } from './app/commands/binaries/validateAndInstallBinaries';
import { ensureProjectFiles } from './app/projectConsistency/projectFilesConsistency';
import { runProjectConsistencyCheck } from './app/commands/runProjectConsistencyCheck';
import { getLogicAppRoots, selectLogicAppRoot } from './app/utils/workspace';

const telemetryString = 'setInGitHubBuild';

export async function activate(context: vscode.ExtensionContext) {
  initializeCustomExtensionContext();

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

    // Workspace setup and consistency checks
    runPostExtractStepsFromCache();
    callWithTelemetryAndErrorHandling('activate.logSubscriptions', async (actionContext: IActionContext) => {
      actionContext.telemetry.properties.isActivationEvent = 'true';
      await logSubscriptions(actionContext);
    });

    activateContext.telemetry.properties.lastStep = 'registerCommands';
    registerCommands();

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      activateContext.telemetry.properties.lastStep = 'ensureWorkspace';
      await callWithTelemetryAndErrorHandling('activate.ensureWorkspace', async (actionContext: IActionContext) => {
        actionContext.telemetry.properties.isActivationEvent = 'true';
        actionContext.errorHandling.rethrow = true;
        actionContext.errorHandling.suppressDisplay = true;
        await ensureWorkspace(actionContext);
      });

      activateContext.telemetry.properties.lastStep = 'parameterizeConnections';
      callWithTelemetryAndErrorHandling('activate.parameterizeAllConnections', async (actionContext: IActionContext) => {
        actionContext.telemetry.properties.isActivationEvent = 'true';
        if (shouldParameterizeConnections() || (await promptShouldParameterizeConnections(actionContext))) {
          actionContext.telemetry.properties.actionTaken = 'true';
          await parameterizeAllConnections(actionContext);
        }
      });

      const projectPaths = await getLogicAppRoots();
      await updateLogicAppsContext(projectPaths);

      activateContext.telemetry.properties.lastStep = 'ensureProjectFiles';
      const ensureProjectFilesTasks = projectPaths.map(async (projectPath) => {
        await callWithTelemetryAndErrorHandling('activate.ensureProjectFiles', async (actionContext: IActionContext) => {
          actionContext.telemetry.properties.isActivationEvent = 'true';
          await ensureProjectFiles(actionContext, projectPath);
        });
      });
      await Promise.all(ensureProjectFilesTasks);

      activateContext.telemetry.properties.lastStep = 'ensureVSCodeFiles';
      callWithTelemetryAndErrorHandling('activate.ensureVSCodeFiles', async (actionContext: IActionContext) => {
        actionContext.telemetry.properties.isActivationEvent = 'true';
        await ensureVSCodeFiles(actionContext, projectPaths);
      });
    }

    activateContext.telemetry.properties.lastStep = 'registerWorkspaceFolderChangeEvent';
    registerEvent(
      extensionEvent.onDidChangeWorkspaceFolders,
      vscode.workspace.onDidChangeWorkspaceFolders,
      async (actionContext: IActionContext) => {
        await updateLogicAppsContext();
        await runProjectConsistencyCheck(actionContext);
      }
    );

    activateContext.telemetry.properties.lastStep = 'promptEnableManagedIdentityAuth';
    callWithTelemetryAndErrorHandling('activate.enableLocalManagedIdentityAuth', async (actionContext: IActionContext) => {
      actionContext.telemetry.properties.isActivationEvent = 'true';
      if (await promptShouldEnableLocalManagedIdentityAuth()) {
        actionContext.telemetry.properties.actionTaken = 'true';
        await enableLocalManagedIdentityAuth(actionContext);
      }
    });

    // Dependencies and environment setup
    activateContext.telemetry.properties.lastStep = 'ensureExtensionBundle';
    await ensureExtensionBundle();

    activateContext.telemetry.properties.lastStep = 'isDevContainerWorkspace';
    const isDevContainer = await isDevContainerWorkspace();
    activateContext.telemetry.properties.isDevContainer = String(isDevContainer);

    activateContext.telemetry.properties.lastStep = 'ensureBinaries';
    await ensureBinaries(activateContext, isDevContainer);

    // Start background processes (design-time func, codeful language server)
    activateContext.telemetry.properties.lastStep = 'startDesignTime';
    callWithTelemetryAndErrorHandling('activate.startDesignTime', async (actionContext: IActionContext) => {
      actionContext.telemetry.properties.isActivationEvent = 'true';
      if (isDevContainer) {
        actionContext.telemetry.properties.designTimeStartupMode = 'devContainerAutoStart';
        actionContext.telemetry.properties.designTimeStartupState = 'scheduled';
        scheduleStartAllDesignTimeApis();
      } else {
        const projectPaths = await getLogicAppRoots();
        if (await promptShouldAutoStartDesignTime(projectPaths)) {
          const startDesignTimePromises = projectPaths.map(async (projectPath) => 
            callWithTelemetryAndErrorHandling('activate.startDesignTimeApi', async (innerActionContext: IActionContext) => {
              innerActionContext.telemetry.properties.isActivationEvent = 'true';
              await startDesignTimeApi(innerActionContext, projectPath);
            })
          );
          await Promise.all(startDesignTimePromises);
        }
      }
    });

    activateContext.telemetry.properties.lastStep = 'startLanguageServer';
    const hasCodefulProjects = await codefulProjectExists();
    if (hasCodefulProjects) {
      callWithTelemetryAndErrorHandling('activate.startLanguageServers', async (actionContext: IActionContext) => {
        await startLanguageServers(actionContext);
      });
    }

    ext.rgApi = await getResourceGroupsApi();
    // @ts-expect-error _rootTreeItem does not exist on type AzExtTreeDataProvider
    ext.azureAccountTreeItem = ext.rgApi.appResourceTree._rootTreeItem as AzureAccountTreeItemWithProjects;

    context.subscriptions.push(ext.outputChannel);
    context.subscriptions.push(ext.azureAccountTreeItem);

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
async function promptShouldEnableLocalManagedIdentityAuth(): Promise<boolean> {
  if (isManagedIdentityAuthNotificationSuppressed() || isManagedIdentityAuthEnabled()) {
    return false;
  }

  const enableButton = localize('enable', 'Enable');
  const closeButton = localize('close', 'Close');
  const dontShowAgain = localize('dontShowAgain', "Don't show again");
  const message = localize('managedIdentityAuthAvailable', 'Managed identity authentication for local workflows is now supported.');

  const selection = await vscode.window.showInformationMessage(message, enableButton, closeButton, dontShowAgain);

  if (selection === enableButton) {
    return true;
  } else if (selection === dontShowAgain) {
    await suppressManagedIdentityAuthNotification();
    return false;
  }

  return false;
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

/**
 * Prompts the user to automatically start the design-time process at launch. If auto start is enabled, start the design-time API for all Logic Apps in the workspace.
 * @param {string[]} projectPaths - The Logic App project paths in the workspace.
 * @returns {Promise<boolean>} A promise that resolves to a value indicating whether the design-time API should be automatically started.
 */
async function promptShouldAutoStartDesignTime(projectPaths: string[]): Promise<boolean> {
  if (!projectPaths || projectPaths.length === 0) {
    return false;
  }

  const autoStartDesignTime = !!getWorkspaceSetting<boolean>(autoStartDesignTimeSetting);
  if (autoStartDesignTime) {
    return true;
  }

  ext.outputChannel.appendLog(
    localize(
      'detectedLogicAppFolders',
      'Detected {0} logic app project folder(s) for artifact regeneration: {1}.',
      projectPaths.length,
      projectPaths.join(', ') || '(none)'
    )
  );

  if (isAutoStartDesignTimeNotificationSuppressed()) {
    return false;
  }

  const message = localize(
    'startDesignTimeApi',
    'Always start the background design-time process at launch? The workflow designer will open faster.'
  );
  const confirm: vscode.MessageItem = { title: localize('yesRecommended', 'Yes (Recommended)') };
  const dontWarnAgain: vscode.MessageItem = { title: localize('dontWarnAgain', "Don't warn again") };
  const result = await vscode.window.showWarningMessage(message, confirm, dontWarnAgain);
  if (result === confirm) {
    await updateGlobalSetting(autoStartDesignTimeSetting, true);
    return true;
  } else if (result === dontWarnAgain) {
    await suppressAutoStartDesignTimeNotification();
  }

  return false;
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
