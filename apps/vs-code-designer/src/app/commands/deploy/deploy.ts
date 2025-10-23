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
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { LogicAppResourceTree } from '../../tree/LogicAppResourceTree';
import { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { SubscriptionTreeItem } from '../../tree/subscriptionTree/subscriptionTreeItem';
import { createAclInConnectionIfNeeded, getConnectionsJson } from '../../utils/codeless/connection';
import { getParametersJson } from '../../utils/codeless/parameter';
import { isPathEqual, writeFormattedJson } from '../../utils/fs';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import { getWorkspaceSetting, getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import { verifyInitForVSCode } from '../../utils/vsCodeConfig/verifyInitForVSCode';
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
import { AzureWizard, DialogResponses } from '@microsoft/vscode-azext-utils';
import type { ConnectionsData, FuncVersion, IIdentityWizardContext, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { Uri, MessageItem, WorkspaceFolder } from 'vscode';
import { deployHybridLogicApp, zipDeployHybridLogicApp } from './hybridLogicApp';
import { createContainerClient } from '../../utils/azureClients';
import { uploadAppSettings } from '../appSettings/uploadAppSettings';
import { isNullOrUndefined, resolveConnectionsReferences } from '@microsoft/logic-apps-shared';
import { buildCustomCodeFunctionsProject } from '../buildCustomCodeFunctionsProject';

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
  actionContext: IActionContext,
  target: Uri | string | SlotTreeItem | undefined,
  functionAppId: string | Record<string, any> | undefined,
  expectedContextValue?: string | RegExp
): Promise<void> {
  addLocalFuncTelemetry(actionContext);

  let deployProjectPathForWorkflowApp: string | undefined;
  const settingsToExclude: string[] = [webhookRedirectHostUri, azureWebJobsStorageKey];
  const deployPaths = await getDeployFsPath(actionContext, target);
  const context: IDeployContext = Object.assign(actionContext, deployPaths, { defaultAppSetting: 'defaultFunctionAppToDeploy' });
  const { originalDeployFsPath, effectiveDeployFsPath, workspaceFolder } = deployPaths;

  if (!isNullOrUndefined(workspaceFolder)) {
    const logicAppNode = workspaceFolder.uri;
    if (!(await fse.pathExists(path.join(logicAppNode.fsPath, libDirectory, 'custom')))) {
      await buildCustomCodeFunctionsProject(actionContext, logicAppNode);
    }
  }

  ext.deploymentFolderPath = originalDeployFsPath;

  let node: SlotTreeItem;

  if (expectedContextValue) {
    node = await getDeployNode(context, ext.rgApi.appResourceTree, target, functionAppId, async () =>
      ext.rgApi.pickAppResource(
        { ...context, suppressCreatePick: false },
        {
          filter: logicAppFilter,
          expectedChildContextValue: expectedContextValue,
        }
      )
    );
  } else {
    node = await getDeployNode(context, ext.rgApi.appResourceTree, target, functionAppId, async () => getDeployLogicAppNode(actionContext));
  }

  const isHybridLogicApp = !!node.isHybridLogicApp;

  const nodeKind = (isHybridLogicApp ? node.hybridSite.type : node.site.kind).toLowerCase();
  const isWorkflowApp = nodeKind?.includes(logicAppKind);
  const isDeployingToKubernetes = nodeKind && nodeKind.indexOf(kubernetesKind) !== -1;
  const [language, version]: [ProjectLanguage, FuncVersion] = await verifyInitForVSCode(context, effectiveDeployFsPath);

  context.telemetry.properties.projectLanguage = language;
  context.telemetry.properties.projectRuntime = version;
  const identityWizardContext: IIdentityWizardContext = {
    clientId: undefined,
    clientSecret: undefined,
    objectId: undefined,
    tenantId: undefined,
    useAdvancedIdentity: undefined,
    ...context,
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

  identityWizardContext?.useAdvancedIdentity ? await updateAppSettingsWithIdentityDetails(context, node, identityWizardContext) : undefined;

  let isZipDeploy = false;

  if (!isHybridLogicApp) {
    await verifyAppSettings(context, node, version, language, originalDeployFsPath, !context.isNewApp);
    const client = await node.site.createClient(actionContext);
    const siteConfig: SiteConfigResource = await client.getSiteConfig();
    isZipDeploy = siteConfig.scmType !== ScmType.LocalGit && siteConfig.scmType !== ScmType.GitHub;

    if (getWorkspaceSetting<boolean>(showDeployConfirmationSetting, workspaceFolder.uri.fsPath) && !context.isNewApp && isZipDeploy) {
      const warning: string = localize(
        'confirmDeploy',
        'Are you sure you want to deploy to "{0}"? This will overwrite any previous deployment and cannot be undone.',
        client.fullName
      );
      context.telemetry.properties.cancelStep = 'confirmDestructiveDeployment';
      const deployButton: MessageItem = { title: localize('deploy', 'Deploy') };
      await context.ui.showWarningMessage(warning, { modal: true }, deployButton, DialogResponses.cancel);
      context.telemetry.properties.cancelStep = '';
    }

    await runPreDeployTask(context, effectiveDeployFsPath, siteConfig.scmType);

    if (isZipDeploy) {
      validateGlobSettings(context, effectiveDeployFsPath);
    }
  }

  await node.runWithTemporaryDescription(context, localize('deploying', 'Deploying...'), async () => {
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
      await cleanupPublishBinPath(context, effectiveDeployFsPath);
    }

    deployProjectPathForWorkflowApp = isWorkflowApp
      ? await getProjectPathToDeploy(node, workspaceFolder, settingsToExclude, deployFsPath, identityWizardContext, actionContext)
      : undefined;

    try {
      if (isHybridLogicApp) {
        if (canUseZipDeployForHybrid(node) && !getWorkspaceSetting<boolean>(useSmbDeployment)) {
          await zipDeployHybridLogicApp(context, node, effectiveDeployFsPath);
        } else {
          await deployHybridLogicApp(context, node);
        }
      } else {
        await innerDeploy(
          node.site,
          deployProjectPathForWorkflowApp !== undefined ? deployProjectPathForWorkflowApp : deployFsPath,
          context
        );
      }
    } finally {
      if (deployProjectPathForWorkflowApp !== undefined && !isHybridLogicApp) {
        await cleanAndRemoveDeployFolder(deployProjectPathForWorkflowApp);
        await node.loadAllChildren(context);
      }
      await uploadAppSettings(context, node.resourceTree.appSettingsTreeItem, workspaceFolder, settingsToExclude);
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

  let [site, isAdvance] = (await context.ui.showQuickPick(getLogicAppsPicks(context, sub.subscription), { placeHolder })).data;
  if (!site) {
    if (isAdvance) {
      return await createLogicAppAdvanced(context, sub);
    }
    return await createLogicApp(context, sub);
  }

  let secrets: ContainerAppSecret[] = [];

  if (site.id.includes('Microsoft.App')) {
    // NOTE(anandgmenon): Getting latest metadata for hybrid app as the one loaded from the cache can have outdateed definition and cause deployment to fail.
    const clientContainer = await createContainerClient({ ...context, ...sub.subscription });
    const resourceGroup = site.id.split('/')?.[4];
    site = (await clientContainer.containerApps.get(resourceGroup, site.name)) as undefined as Site;
    secrets = (await clientContainer.containerApps.listSecrets(resourceGroup, site.name)).value;
  }
  const resourceTree = new LogicAppResourceTree(sub.subscription, site, secrets);

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

/**
 * Authentication discriminated-union types used to strongly-type auth payloads
 * written to parameters.json and/or connections.json.
 */
interface ManagedServiceIdentityAuth {
  type: 'ManagedServiceIdentity';
}

interface ActiveDirectoryOAuthAuth {
  type: 'ActiveDirectoryOAuth';
  audience: string;
  credentialType: string;
  clientId: string;
  tenant: string;
  secret: string;
}

/**
 * Union of supported authentication payloads that can be emitted to either
 * parameters.json (parameterized deployments) or connections.json (direct write).
 */
type AuthenticationValue = ManagedServiceIdentityAuth | ActiveDirectoryOAuthAuth;

/**
 * Returns a temporary deployable project path after updating connection authentication
 * to either MSI or AAD OAuth depending on identityWizardContext.useAdvancedIdentity and
 * whether the project is parameterized or not.
 *
 * @param node                        The target Function/Workflow site/slot tree item.
 * @param workspaceFolder             The VS Code workspace folder that contains the Logic App project.
 * @param settingsToExclude           A mutable list of app setting names that should be excluded from deployment.
 * @param originalDeployFsPath        The original path being prepared for deployment (copied into a temp folder).
 * @param identityWizardContext       Context that indicates whether to use advanced identity (AAD OAuth) vs MSI.
 * @param actionContext               Action context for telemetry, error tagging, and cancellation.
 * @returns                           The fully prepared temporary deploy path, or undefined if no changes are needed.
 */
async function getProjectPathToDeploy(
  node: SlotTreeItem,
  workspaceFolder: WorkspaceFolder,
  settingsToExclude: string[],
  originalDeployFsPath: string,
  identityWizardContext: IIdentityWizardContext,
  actionContext: IActionContext
): Promise<string | undefined> {
  const workspaceFolderPath = workspaceFolder.uri.fsPath;

  // Load current project artifacts
  const connectionsJson = await getConnectionsJson(workspaceFolderPath);
  const parametersJson = await getParametersJson(workspaceFolderPath);
  const targetAppSettings = await node.getApplicationSettings(identityWizardContext as IDeployContext);

  // Whether the project uses parameterized connections (parameters.json) or writes directly to connections.json
  const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);

  let resolvedConnections: ConnectionsData;
  let connectionsData: ConnectionsData;

  /**
   * Writes the provided AuthenticationValue into parameters.json for each managed API connection.
   * This is used when the project is parameterized (parameterizeConnectionsSetting = true).
   *
   * @param authValue  A discriminated AuthenticationValue (MSI or AAD OAuth).
   */
  function updateAuthenticationParameters(authValue: AuthenticationValue): void {
    if (connectionsData.managedApiConnections && Object.keys(connectionsData.managedApiConnections).length) {
      for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
        const paramKey = `${referenceKey}-Authentication`;

        // Ensure parameter record exists to avoid undefined index errors.
        if (!parametersJson[paramKey]) {
          parametersJson[paramKey] = {
            type: 'Object',
            value: {},
          };
        }

        parametersJson[paramKey].value = authValue;
        actionContext.telemetry.properties.updateAuth = `updated "${paramKey}" parameter to ${authValue.type}`;
      }
    }
  }

  /**
   * Writes the provided AuthenticationValue directly into connections.json for each managed API connection.
   * This is used when the project is not parameterized (parameterizeConnectionsSetting = false).
   *
   * @param authValue  A discriminated AuthenticationValue (MSI or AAD OAuth).
   */
  function updateAuthenticationInConnections(authValue: AuthenticationValue): void {
    if (connectionsData.managedApiConnections && Object.keys(connectionsData.managedApiConnections).length) {
      for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
        connectionsData.managedApiConnections[referenceKey].authentication = authValue;
        actionContext.telemetry.properties.updateAuth = `updated "${referenceKey}" connection authentication to ${authValue.type}`;
      }
    }
  }

  try {
    // Parse connections.json and construct the desired auth payloads with strict typing
    connectionsData = JSON.parse(connectionsJson) as ConnectionsData;

    const authValue: ManagedServiceIdentityAuth = { type: 'ManagedServiceIdentity' };

    // These are expected to be available in scope as constants/placeholders resolved at build/deploy time.
    const advancedIdentityAuthValue: ActiveDirectoryOAuthAuth = {
      type: 'ActiveDirectoryOAuth',
      audience: 'https://management.core.windows.net/',
      credentialType: 'Secret',
      clientId: `@appsetting('${workflowAppAADClientId}')`,
      tenant: `@appsetting('${workflowAppAADTenantId}')`,
      secret: `@appsetting('${workflowAppAADClientSecret}')`,
    };

    // Choose whether to write into parameters.json (parameterized) or connections.json (direct)
    if (parameterizeConnectionsSetting) {
      identityWizardContext?.useAdvancedIdentity
        ? updateAuthenticationParameters(advancedIdentityAuthValue)
        : updateAuthenticationParameters(authValue);
    } else {
      identityWizardContext?.useAdvancedIdentity
        ? updateAuthenticationInConnections(advancedIdentityAuthValue)
        : updateAuthenticationInConnections(authValue);
    }

    // Resolve references using the updated structures prior to ACL work
    resolvedConnections = resolveConnectionsReferences(connectionsJson, parametersJson, targetAppSettings);
  } catch {
    actionContext.telemetry.properties.noAuthUpdate = 'No authentication update was made';
    return undefined;
  }

  // If there are managed API connections, prepare a temp deploy folder and perform ACL setup
  if (connectionsData.managedApiConnections && Object.keys(connectionsData.managedApiConnections).length) {
    const deployProjectPath = path.join(path.dirname(workspaceFolderPath), `${path.basename(workspaceFolderPath)}-deploytemp`);
    const connectionsFilePathDeploy = path.join(deployProjectPath, connectionsFileName);
    const parametersFilePathDeploy = path.join(deployProjectPath, parametersFileName);

    // Ensure a clean temp folder
    if (await fse.pathExists(deployProjectPath)) {
      await cleanAndRemoveDeployFolder(deployProjectPath);
    }
    fse.mkdirSync(deployProjectPath);

    // Copy original deployment payload into the temp folder
    await fse.copy(originalDeployFsPath, deployProjectPath, { overwrite: true });

    // For each connection, ensure access policies (ACL) exist as needed
    for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
      try {
        const connection = resolvedConnections.managedApiConnections[referenceKey].connection;
        await createAclInConnectionIfNeeded(identityWizardContext, connection.id, node);

        // If deploying to a slot, also set ACL on the parent site
        if (node.site.isSlot) {
          const parentTreeItem = node.parent?.parent as SlotTreeItem;
          await createAclInConnectionIfNeeded(identityWizardContext, connection.id, parentTreeItem);
        }
      } catch (error) {
        throw new Error(`Error in creating access policy for connection in reference - '${referenceKey}'. ${error}`);
      }

      // Exclude ephemeral connection keys from app settings deployment
      settingsToExclude.push(`${referenceKey}-connectionKey`);
    }

    // Persist updated artifacts to the temp folder
    await writeFormattedJson(connectionsFilePathDeploy, connectionsData);
    await writeFormattedJson(parametersFilePathDeploy, parametersJson);

    return deployProjectPath;
  }

  return undefined;
}

/**
 * Empties and removes the deploy temp folder.
 *
 * @param deployProjectPath  Full path to the temporary deployment folder.
 */
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
