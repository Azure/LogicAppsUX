/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LogicAppResolver } from '../../../LogicAppResolver';
import {
  logicAppKind,
  deploySubpathSetting,
  connectionsFileName,
  parametersFileName,
  webhookRedirectHostUri,
  workflowAppAADClientId,
  workflowAppAADClientSecret,
  workflowAppAADObjectId,
  workflowAppAADTenantId,
  kubernetesKind,
  showDeployConfirmationSetting,
  logicAppFilter,
  parameterizeConnectionsInProjectLoadSetting,
  azureWebJobsStorageKey,
  isZipDeployEnabledSetting,
  useSmbDeployment,
  libDirectory,
  customDirectory,
  workflowAuthenticationMethodKey,
  ProjectDirectoryPathKey,
  funcVersionSetting,
  projectLanguageSetting,
  inlineCodeNodeExecutablePathKey,
  extensionCommand,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { LogicAppResourceTree } from '../../tree/LogicAppResourceTree';
import { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { SubscriptionTreeItem } from '../../tree/subscriptionTree/subscriptionTreeItem';
import { createAclInConnectionIfNeeded, getConnectionsJson } from '../../utils/codeless/connection';
import { getParametersJson } from '../../utils/codeless/parameter';
import { isPathEqual, writeFormattedJson } from '../../utils/fs';
import { addLocalFuncTelemetry, tryParseFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { getWorkspaceSetting, getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { createLogicAppAdvanced, createLogicApp } from '../createLogicApp/createLogicApp';
import {
  AdvancedIdentityObjectIdStep,
  AdvancedIdentityClientIdStep,
  AdvancedIdentityTenantIdStep,
  AdvancedIdentityClientSecretStep,
} from '../createLogicApp/createLogicAppSteps/advancedIdentityPromptSteps';
import { notifyDeployComplete } from './notifyDeployComplete';
import { updateAppSettingsWithIdentityDetails } from './updateAppSettings';
import { verifyAppSettings } from './verifyAppSettings';
import type { SiteConfigResource, StringDictionary, Site, ContainerAppSecret } from '@azure/arm-appservice';
import { deploy as innerDeploy, getDeployFsPath, runPreDeployTask, getDeployNode } from '@microsoft/vscode-azext-azureappservice';
import type { IDeployContext } from '@microsoft/vscode-azext-azureappservice';
import { ScmType } from '@microsoft/vscode-azext-azureappservice/out/src/ScmType';
import type { AzExtParentTreeItem, IActionContext, IAzureQuickPickItem, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { AzureWizard, DialogResponses, nonNullOrEmptyValue } from '@microsoft/vscode-azext-utils';
import type { ConnectionsData, FuncVersion, IIdentityWizardContext, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { Uri, MessageItem, WorkspaceFolder } from 'vscode';
import { deployHybridLogicApp, zipDeployHybridLogicApp } from './hybridLogicApp';
import { createContainerClient } from '../../utils/azureClients';
import { uploadAppSettings } from '../appSettings/uploadAppSettings';
import { isNullOrUndefined, resolveConnectionsReferences } from '@microsoft/logic-apps-shared';
import { tryBuildCustomCodeFunctionsProject } from '../buildCustomCodeFunctionsProject';
import { publishCodefulProject } from '../publishCodefulProject';
import { hasCodefulWorkflowSetting } from '../../utils/codeful';
import { isProjectInitializedForVSCode } from '../../projectConsistency/vscodeConsistency';
import { initProjectForVSCode } from '../initProjectForVSCode/initProjectForVSCode';
import { callWithDurationTelemetry } from '../../utils/telemetry';

export async function deployProductionSlot(
  context: IActionContext,
  target?: Uri | string | SlotTreeItem,
  functionAppId?: string | Record<string, any>
): Promise<void> {
  await deploy(context, target, functionAppId);
}

export async function deploySlot(
  context: IActionContext,
  target?: Uri | string | SlotTreeItem,
  functionAppId?: string | Record<string, any>
): Promise<void> {
  await deploy(context, target, functionAppId, new RegExp(LogicAppResourceTree.pickSlotContextValue));
}

async function deploy(
  context: IActionContext,
  target: Uri | string | SlotTreeItem | undefined,
  functionAppId: string | Record<string, any> | undefined,
  expectedContextValue?: string | RegExp
): Promise<void> {
  addLocalFuncTelemetry(context);

  let deployProjectPathForWorkflowApp: string | undefined;
  const settingsToExclude: string[] = [
    webhookRedirectHostUri,
    azureWebJobsStorageKey,
    ProjectDirectoryPathKey,
    workflowAuthenticationMethodKey,
    'REMOTEDEBUGGINGVERSION',
    // Local-debug-only: absolute path to the local Node.js binary used by the inline-code
    // language worker. Deploying it points the cloud worker at a non-existent local path,
    // which hangs "Execute JavaScript Code" actions in a Running state indefinitely.
    inlineCodeNodeExecutablePathKey,
  ];
  const deployPaths = await getDeployFsPath(context, target);
  const deployContext: IDeployContext = Object.assign(context, deployPaths, { defaultAppSetting: 'defaultFunctionAppToDeploy' });
  const { originalDeployFsPath, effectiveDeployFsPath, workspaceFolder } = deployPaths;

  if (!isNullOrUndefined(workspaceFolder)) {
    const logicAppNode = workspaceFolder.uri;

    const isCodeful = await hasCodefulWorkflowSetting(logicAppNode.fsPath);
    if (isCodeful) {
      deployContext.telemetry.properties.isCodefulProject = 'true';
      ext.outputChannel.appendLog(localize('buildingCodefulProject', 'Building and publishing codeful Logic App project...'));
      await callWithDurationTelemetry(extensionCommand.publishCodefulProject, async (actionContext: IActionContext) => {
        await publishCodefulProject(actionContext, logicAppNode);
      });
    } else {
      const customCodeFolderExists = await fse.pathExists(path.join(logicAppNode.fsPath, libDirectory, customDirectory));
      if (customCodeFolderExists) {
        await callWithDurationTelemetry(extensionCommand.buildCustomCodeFunctionsProject, async (actionContext: IActionContext) => {
          await tryBuildCustomCodeFunctionsProject(actionContext, logicAppNode);
        });
      }
    }
  }

  ext.deploymentFolderPath = originalDeployFsPath;

  let node: SlotTreeItem;

  if (expectedContextValue) {
    node = await getDeployNode(deployContext, ext.rgApi.appResourceTree, target, functionAppId, async () =>
      ext.rgApi.pickAppResource(
        { ...deployContext, suppressCreatePick: false },
        {
          filter: logicAppFilter,
          expectedChildContextValue: expectedContextValue,
        }
      )
    );
  } else {
    node = await getDeployNode(deployContext, ext.rgApi.appResourceTree, target, functionAppId, async () => getDeployLogicAppNode(context));
  }

  const isHybridLogicApp = !!node.isHybridLogicApp;

  const nodeKind = (isHybridLogicApp ? node.hybridSite.type : node.site.kind).toLowerCase();
  const isWorkflowApp = nodeKind?.includes(logicAppKind);
  const isDeployingToKubernetes = nodeKind && nodeKind.indexOf(kubernetesKind) !== -1;

  if (!isProjectInitializedForVSCode(effectiveDeployFsPath)) {
    const message: string = localize('initFolder', 'Initialize project for use with VS Code?');
    await deployContext.ui.showWarningMessage(message, { modal: true }, DialogResponses.yes);
    await callWithDurationTelemetry(extensionCommand.initProjectForVSCode, async (actionContext: IActionContext) => {
      await initProjectForVSCode(actionContext, effectiveDeployFsPath);
    });
  }

  const language = nonNullOrEmptyValue(getWorkspaceSetting(projectLanguageSetting, effectiveDeployFsPath), projectLanguageSetting) as ProjectLanguage;
  const version = nonNullOrEmptyValue(tryParseFuncVersion(getWorkspaceSetting(funcVersionSetting, effectiveDeployFsPath)), funcVersionSetting) as FuncVersion;

  deployContext.telemetry.properties.projectLanguage = language;
  deployContext.telemetry.properties.projectRuntime = version;
  const identityWizardContext: IIdentityWizardContext = {
    clientId: undefined,
    clientSecret: undefined,
    objectId: undefined,
    tenantId: undefined,
    useAdvancedIdentity: undefined,
    ...deployContext,
  };

  if (isDeployingToKubernetes) {
    const managedApiConnectionExists = await managedApiConnectionsExists(workspaceFolder);
    if (managedApiConnectionExists) {
      const aadDetailsExist = await checkAADDetailsExistsInAppSettings(node, identityWizardContext);
      if (!aadDetailsExist) {
        const wizard: AzureWizard<IIdentityWizardContext> = new AzureWizard(identityWizardContext, {
          promptSteps: [
            new AdvancedIdentityObjectIdStep(),
            new AdvancedIdentityClientIdStep(),
            new AdvancedIdentityTenantIdStep(),
            new AdvancedIdentityClientSecretStep(),
          ],
          title: localize('aadDetails', 'Provide your AAD identity details to use with your Azure connections.'),
        });
        await wizard.prompt();
      }
      identityWizardContext.useAdvancedIdentity = true;
    }
  }

  if (identityWizardContext?.useAdvancedIdentity) {
    await updateAppSettingsWithIdentityDetails(deployContext, node, identityWizardContext);
  }

  let isZipDeploy = false;

  if (!isHybridLogicApp) {
    await verifyAppSettings(deployContext, node, version, language, originalDeployFsPath, !deployContext.isNewApp);
    const client = await node.site.createClient(context);
    const siteConfig: SiteConfigResource = await client.getSiteConfig();
    isZipDeploy = siteConfig.scmType !== ScmType.LocalGit && siteConfig.scmType !== ScmType.GitHub;

    if (getWorkspaceSetting<boolean>(showDeployConfirmationSetting, workspaceFolder.uri.fsPath) && !deployContext.isNewApp && isZipDeploy) {
      const warning: string = localize(
        'confirmDeploy',
        'Are you sure you want to deploy to "{0}"? This will overwrite any previous deployment and cannot be undone.',
        client.fullName
      );
      deployContext.telemetry.properties.cancelStep = 'confirmDestructiveDeployment';
      const deployButton: MessageItem = { title: localize('deploy', 'Deploy') };
      await deployContext.ui.showWarningMessage(warning, { modal: true }, deployButton, DialogResponses.cancel);
      deployContext.telemetry.properties.cancelStep = '';
    }

    await runPreDeployTask(deployContext, effectiveDeployFsPath, siteConfig.scmType);

    if (isZipDeploy) {
      validateGlobSettings(deployContext, effectiveDeployFsPath);
    }
  }

  await node.runWithTemporaryDescription(deployContext, localize('deploying', 'Deploying...'), async () => {
    // preDeploy tasks are only required for zipdeploy so subpath may not exist
    let deployFsPath: string = effectiveDeployFsPath;

    if (!isZipDeploy && !isPathEqual(effectiveDeployFsPath, originalDeployFsPath)) {
      deployFsPath = originalDeployFsPath;
      const noSubpathWarning = `WARNING: Ignoring deploySubPath "${getWorkspaceSetting(
        deploySubpathSetting,
        originalDeployFsPath
      )}" for non-zip deploy.`;
      ext.outputChannel.appendLog(noSubpathWarning);
    }

    if (isWorkflowApp) {
      await cleanupPublishBinPath(deployContext, effectiveDeployFsPath);
    }

    deployProjectPathForWorkflowApp = isWorkflowApp
      ? await getProjectPathToDeploy(node, workspaceFolder, settingsToExclude, deployFsPath, identityWizardContext, context)
      : undefined;

    try {
      if (isHybridLogicApp) {
        if (canUseZipDeployForHybrid(node) && !getWorkspaceSetting<boolean>(useSmbDeployment)) {
          await zipDeployHybridLogicApp(deployContext, node, effectiveDeployFsPath);
        } else {
          await deployHybridLogicApp(deployContext, node);
        }
      } else {
        await innerDeploy(
          node.site,
          deployProjectPathForWorkflowApp !== undefined ? deployProjectPathForWorkflowApp : deployFsPath,
          deployContext
        );
      }
    } finally {
      if (deployProjectPathForWorkflowApp !== undefined && !isHybridLogicApp) {
        await cleanAndRemoveDeployFolder(deployProjectPathForWorkflowApp);
        await node.loadAllChildren(deployContext);
      }
      await uploadAppSettings(deployContext, node.resourceTree.appSettingsTreeItem, workspaceFolder, settingsToExclude);
    }
  });

  await notifyDeployComplete(node, isHybridLogicApp);
}

/**
 * Shows tree item picker to select Logic App or create a new one.
 * @param {IActionContext} context - Command context.
 * @returns {Promise<SlotTreeItem>} Logic App slot tree item.
 */
async function getDeployLogicAppNode(context: IActionContext): Promise<SlotTreeItem> {
  const placeHolder: string = localize('selectLogicApp', 'Select Logic App (Standard) in Azure');
  const sub = await ext.rgApi.appResourceTree.showTreeItemPicker<AzExtParentTreeItem>(SubscriptionTreeItem.contextValue, context);

  const [site, isAdvance] = (await context.ui.showQuickPick(getLogicAppsPicks(context, sub.subscription), { placeHolder })).data;
  if (!site) {
    if (isAdvance) {
      return await createLogicAppAdvanced(context, sub);
    }
    return await createLogicApp(context, sub);
  }

  let secrets: ContainerAppSecret[] = [];

  let hybridSite: Site | undefined;
  if (site.id.includes('Microsoft.App')) {
    // NOTE(anandgmenon): Getting latest metadata for hybrid app as the one loaded from the cache can have outdateed definition and cause deployment to fail.
    const clientContainer = await createContainerClient({ ...context, ...sub.subscription });
    const resourceGroup = site.id.split('/')?.[4];
    hybridSite = (await clientContainer.containerApps.get(resourceGroup, site.name)) as undefined as Site;
    secrets = (await clientContainer.containerApps.listSecrets(resourceGroup, hybridSite.name)).value;
  }
  const resourceTree = hybridSite
    ? new LogicAppResourceTree(sub.subscription, hybridSite, secrets)
    : new LogicAppResourceTree(sub.subscription, site, secrets);

  return new SlotTreeItem(sub, resourceTree);
}

async function getLogicAppsPicks(
  context: IActionContext,
  subContext: ISubscriptionContext
): Promise<IAzureQuickPickItem<[Site | undefined, boolean]>[]> {
  const logicAppsResolver = new LogicAppResolver();
  const sites = await logicAppsResolver.getAppResourceSiteBySubscription(context, subContext);
  const picks: { label: string; data: [Site, boolean]; description?: string }[] = [];

  Array.from(sites.logicApps).forEach(([_id, site]) => {
    picks.push({ label: site.name, data: [site, false] });
  });

  Array.from(sites.hybridLogicApps).forEach(([_id, site]) => {
    picks.push({ label: `${site.name} (Hybrid)`, data: [site as unknown as Site, false] });
  });

  picks.sort((a, b) => a.label.localeCompare(b.label));
  picks.unshift({
    label: localize('selectLogicApp', '$(plus) Create new Logic App (Standard) in Azure...'),
    data: [undefined, true],
    description: localize('advanced', 'Advanced'),
  });
  picks.unshift({ label: localize('selectLogicApp', '$(plus) Create new Logic App (Standard) in Azure...'), data: [undefined, false] });

  return picks;
}

/**
 * Azure functions task `_GenerateFunctionsExtensionsMetadataPostPublish` moves `NetFxWorker`
 * in `bin/` of publish path, It needs to be reverted as it's a special case where we have a
 * Azure Function Extension inside a Logic App Extension.
 * @param context {@link IActionContext}
 * @param fsPath publish path for logic app extension
 */
async function cleanupPublishBinPath(_context: IActionContext, fsPath: string): Promise<void> {
  const netFxWorkerBinPath = path.join(fsPath, 'bin', 'NetFxWorker');
  const netFxWorkerAssetPath = path.join(fsPath, 'NetFxWorker');
  if (await fse.pathExists(netFxWorkerBinPath)) {
    return fse.move(netFxWorkerBinPath, netFxWorkerAssetPath, { overwrite: true });
  }
}

async function validateGlobSettings(context: IActionContext, fsPath: string): Promise<void> {
  const includeKey = 'zipGlobPattern';
  const excludeKey = 'zipIgnorePattern';
  const includeSetting: string | undefined = getWorkspaceSetting(includeKey, fsPath);
  const excludeSetting: string | string[] | undefined = getWorkspaceSetting(excludeKey, fsPath);

  if (includeSetting || excludeSetting) {
    context.telemetry.properties.hasOldGlobSettings = 'true';
    const message: string = localize(
      'globSettingRemoved',
      '"{0}" and "{1}" settings are no longer supported. Instead, place a ".funcignore" file at the root of your repo, using the same syntax as a ".gitignore" file.',
      includeKey,
      excludeKey
    );
    await context.ui.showWarningMessage(message);
  }
}

async function managedApiConnectionsExists(workspaceFolder: WorkspaceFolder): Promise<boolean> {
  const workspaceFolderPath = workspaceFolder.uri.fsPath;
  const connectionsJson = await getConnectionsJson(workspaceFolderPath);
  let connectionsData: ConnectionsData;

  try {
    connectionsData = JSON.parse(connectionsJson);
  } catch {
    return false;
  }

  return !!connectionsData.managedApiConnections && Object.keys(connectionsData.managedApiConnections).length > 0;
}

async function getProjectPathToDeploy(
  node: SlotTreeItem,
  workspaceFolder: WorkspaceFolder,
  settingsToExclude: string[],
  originalDeployFsPath: string,
  identityWizardContext: IIdentityWizardContext,
  actionContext: IActionContext
): Promise<string | undefined> {
  const workspaceFolderPath = workspaceFolder.uri.fsPath;
  const connectionsJson = await getConnectionsJson(workspaceFolderPath);
  const parametersJson = await getParametersJson(workspaceFolderPath);
  const targetAppSettings = await node.getApplicationSettings(identityWizardContext as IDeployContext);
  const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);
  let resolvedConnections: ConnectionsData;
  let connectionsData: ConnectionsData;

  function updateAuthenticationParameters(authValue: any): void {
    if (connectionsData.managedApiConnections && Object.keys(connectionsData.managedApiConnections).length) {
      for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
        parametersJson[`${referenceKey}-Authentication`].value = authValue;
        actionContext.telemetry.properties.updateAuth = `updated "${referenceKey}-Authentication" parameter to ManagedServiceIdentity`;
      }
    }
  }

  function updateAuthenticationInConnections(authValue: any): void {
    if (connectionsData.managedApiConnections && Object.keys(connectionsData.managedApiConnections).length) {
      for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
        connectionsData.managedApiConnections[referenceKey].authentication = authValue;
        actionContext.telemetry.properties.updateAuth = `updated "${referenceKey}" connection authentication to ManagedServiceIdentity`;
      }
    }
  }

  try {
    connectionsData = JSON.parse(connectionsJson);
    const authValue = identityWizardContext?.useAdvancedIdentity
      ? {
          type: 'ActiveDirectoryOAuth',
          audience: 'https://management.core.windows.net/',
          credentialType: 'Secret',
          clientId: `@appsetting('${workflowAppAADClientId}')`,
          tenant: `@appsetting('${workflowAppAADTenantId}')`,
          secret: `@appsetting('${workflowAppAADClientSecret}')`,
        }
      : { type: 'ManagedServiceIdentity' };

    if (parameterizeConnectionsSetting) {
      updateAuthenticationParameters(authValue);
    } else {
      updateAuthenticationInConnections(authValue);
    }

    resolvedConnections = resolveConnectionsReferences(connectionsJson, parametersJson, targetAppSettings);
  } catch {
    actionContext.telemetry.properties.noAuthUpdate = 'No authentication update was made';
    return undefined;
  }

  if (connectionsData.managedApiConnections && Object.keys(connectionsData.managedApiConnections).length) {
    const deployProjectPath = path.join(path.dirname(workspaceFolderPath), `${path.basename(workspaceFolderPath)}-deploytemp`);
    const connectionsFilePathDeploy = path.join(deployProjectPath, connectionsFileName);
    const parametersFilePathDeploy = path.join(deployProjectPath, parametersFileName);

    if (await fse.pathExists(deployProjectPath)) {
      await cleanAndRemoveDeployFolder(deployProjectPath);
    }

    fse.mkdirSync(deployProjectPath);

    await fse.copy(originalDeployFsPath, deployProjectPath, { overwrite: true });

    for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
      try {
        const connection = resolvedConnections.managedApiConnections[referenceKey].connection;
        await createAclInConnectionIfNeeded(identityWizardContext, connection.id, node);

        if (node.site.isSlot) {
          const parentTreeItem = node.parent?.parent as SlotTreeItem;
          await createAclInConnectionIfNeeded(identityWizardContext, connection.id, parentTreeItem);
        }
      } catch (error) {
        throw new Error(`Error in creating access policy for connection in reference - '${referenceKey}'. ${error}`);
      }

      settingsToExclude.push(`${referenceKey}-connectionKey`);
    }

    await writeFormattedJson(connectionsFilePathDeploy, connectionsData);
    await writeFormattedJson(parametersFilePathDeploy, parametersJson);

    return deployProjectPath;
  }
  return undefined;
}

async function cleanAndRemoveDeployFolder(deployProjectPath: string): Promise<void> {
  await fse.emptyDir(deployProjectPath);
  fse.rmdirSync(deployProjectPath);
}

async function checkAADDetailsExistsInAppSettings(node: SlotTreeItem, identityWizardContext: IIdentityWizardContext): Promise<boolean> {
  const client = await node.site.createClient(identityWizardContext);
  const appSettings: StringDictionary | undefined = (await client.listApplicationSettings())?.properties;
  if (appSettings) {
    const clientId = appSettings[workflowAppAADClientId];
    const objectId = appSettings[workflowAppAADObjectId];
    const tenantId = appSettings[workflowAppAADTenantId];
    const clientSecret = appSettings[workflowAppAADClientSecret];
    const aadDetailsExists = !!clientId && !!objectId && !!tenantId && !!clientSecret;
    identityWizardContext.clientId = clientId;
    identityWizardContext.clientSecret = clientSecret;
    identityWizardContext.objectId = objectId;
    identityWizardContext.tenantId = tenantId;
    identityWizardContext.useAdvancedIdentity = aadDetailsExists;
    return aadDetailsExists;
  }
  return false;
}

function canUseZipDeployForHybrid(node: SlotTreeItem): boolean {
  const requiredEnvVars = [
    workflowAppAADClientId,
    workflowAppAADClientSecret,
    workflowAppAADObjectId,
    workflowAppAADTenantId,
    isZipDeployEnabledSetting,
  ];

  if (!node.hybridSite?.template?.containers?.[0]?.env) {
    return false;
  }

  const envVars = node.hybridSite?.template?.containers?.[0].env.map((env: any) => env.name);
  return (
    requiredEnvVars.every((varName) => envVars.includes(varName)) &&
    node.hybridSite.template.containers[0].env.some((env: any) => env.name === isZipDeployEnabledSetting && env.value === 'true')
  );
}
