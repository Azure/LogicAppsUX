/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LogicAppResolver } from '../../../LogicAppResolver';
import {
  logicAppKind,
  deploySubpathSetting,
  connectionsFileName,
  webhookRedirectHostUri,
  workflowAppAADClientId,
  workflowAppAADClientSecret,
  workflowAppAADObjectId,
  workflowAppAADTenantId,
  kubernetesKind,
  showDeployConfirmationSetting,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { LogicAppResourceTree } from '../../tree/LogicAppResourceTree';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { SubscriptionTreeItem } from '../../tree/subscriptionTree/SubscriptionTreeItem';
import { createAclInConnectionIfNeeded, getConnectionsJson } from '../../utils/codeless/connection';
import { getParametersJson } from '../../utils/codeless/parameter';
import { isPathEqual, writeFormattedJson } from '../../utils/fs';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { verifyInitForVSCode } from '../../utils/vsCodeConfig/verifyInitForVSCode';
import {
  AdvancedIdentityObjectIdStep,
  AdvancedIdentityClientIdStep,
  AdvancedIdentityTenantIdStep,
  AdvancedIdentityClientSecretStep,
} from '../createLogicApp/createLogicAppSteps/AdvancedIdentityPromptSteps';
import { notifyDeployComplete } from './notifyDeployComplete';
import { updateAppSettingsWithIdentityDetails } from './updateAppSettings';
import { verifyAppSettings } from './verifyAppSettings';
import type { SiteConfigResource, StringDictionary, Site } from '@azure/arm-appservice';
import { ResolutionService } from '@microsoft/parsers-logic-apps';
import {
  deploy as innerDeploy,
  getDeployFsPath,
  runPreDeployTask,
  getDeployNode,
  ParsedSite,
} from '@microsoft/vscode-azext-azureappservice';
import type { IDeployContext } from '@microsoft/vscode-azext-azureappservice';
import { ScmType } from '@microsoft/vscode-azext-azureappservice/out/src/ScmType';
import type { AzExtParentTreeItem, IActionContext, IAzureQuickPickItem, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { AzureWizard, DialogResponses } from '@microsoft/vscode-azext-utils';
import type { ConnectionsData, FuncVersion, IIdentityWizardContext, ProjectLanguage } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { Uri, MessageItem, WorkspaceFolder } from 'vscode';

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
  _expectedContextValue?: string | RegExp
): Promise<void> {
  addLocalFuncTelemetry(actionContext);

  let deployProjectPathForWorkflowApp: string | undefined;
  const settingsToExclude: string[] = [webhookRedirectHostUri];
  const deployPaths = await getDeployFsPath(actionContext, target);
  const context: IDeployContext = Object.assign(actionContext, deployPaths, { defaultAppSetting: 'defaultFunctionAppToDeploy' });
  const { originalDeployFsPath, effectiveDeployFsPath, workspaceFolder } = deployPaths;

  ext.deploymentFolderPath = originalDeployFsPath;

  const node: SlotTreeItem = await getDeployNode(context, ext.rgApi.appResourceTree, target, functionAppId, async () =>
    getDeployLogicAppNode(actionContext)
  );

  const nodeKind = node.site.kind && node.site.kind.toLowerCase();
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

  await verifyAppSettings(context, node, version, language, originalDeployFsPath, !context.isNewApp);

  const client = await node.site.createClient(actionContext);
  const siteConfig: SiteConfigResource = await client.getSiteConfig();
  const isZipDeploy: boolean = siteConfig.scmType !== ScmType.LocalGit && siteConfig.scmType !== ScmType.GitHub;

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
      ? await getProjectPathToDeploy(node, workspaceFolder, settingsToExclude, deployFsPath, identityWizardContext)
      : undefined;

    try {
      await innerDeploy(node.site, deployProjectPathForWorkflowApp !== undefined ? deployProjectPathForWorkflowApp : deployFsPath, context);
    } finally {
      if (deployProjectPathForWorkflowApp !== undefined) {
        await cleanAndRemoveDeployFolder(deployProjectPathForWorkflowApp);
      }
    }
  });

  await node.loadAllChildren(context);
  await notifyDeployComplete(node, context.workspaceFolder, settingsToExclude);
}

async function getDeployLogicAppNode(context: IActionContext): Promise<SlotTreeItem> {
  const placeHolder: string = localize('selectLogicApp', 'Select Logic App (Standard) in Azure');
  const sub = await ext.rgApi.appResourceTree.showTreeItemPicker<AzExtParentTreeItem>(SubscriptionTreeItem.contextValue, context);

  const [site, isAdvance] = (await context.ui.showQuickPick(getLogicAppsPicks(context, sub.subscription), { placeHolder })).data;
  if (!site) {
    if (isAdvance) {
      console.log('create new logic app advance');
    } else {
      console.log('create new logic app');
    }
  } else {
    console.log('create new logic app');
  }
  const parsedSite = new ParsedSite(site, sub.subscription);

  return { site: parsedSite } as SlotTreeItem;
}

async function getLogicAppsPicks(
  context: IActionContext,
  subContext: ISubscriptionContext
): Promise<IAzureQuickPickItem<[Site | undefined, boolean]>[]> {
  const listOfLogicApps = await LogicAppResolver.getAppResourceSiteBySubscription(context, subContext);
  const picks: { label: string; data: [Site, boolean]; description?: string }[] = Array.from(listOfLogicApps).map(([_id, site]) => {
    return { label: site.name, data: [site, false] };
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
async function cleanupPublishBinPath(context: IActionContext, fsPath: string): Promise<void> {
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
  identityWizardContext: IIdentityWizardContext
): Promise<string | undefined> {
  const workspaceFolderPath = workspaceFolder.uri.fsPath;
  const connectionsJson = await getConnectionsJson(workspaceFolderPath);
  const parametersJson = await getParametersJson(workspaceFolderPath);
  let connectionsData: ConnectionsData;
  let parametizedConnections: ConnectionsData;

  const targetAppSettings = await node.getApplicationSettings(identityWizardContext as IDeployContext);
  const resolutionService = new ResolutionService(parametersJson, targetAppSettings);
  try {
    parametizedConnections = JSON.parse(connectionsJson);
    connectionsData = resolutionService.resolve(parametizedConnections);
  } catch {
    return undefined;
  }

  if (parametizedConnections.managedApiConnections && Object.keys(parametizedConnections.managedApiConnections).length) {
    const deployProjectPath = path.join(path.dirname(workspaceFolderPath), `${path.basename(workspaceFolderPath)}-deploytemp`);
    const connectionsFilePath = path.join(deployProjectPath, connectionsFileName);

    if (await fse.pathExists(deployProjectPath)) {
      await cleanAndRemoveDeployFolder(deployProjectPath);
    }

    fse.mkdirSync(deployProjectPath);

    await fse.copy(originalDeployFsPath, deployProjectPath, { overwrite: true, recursive: true });

    for (const [referenceKey, managedConnection] of Object.entries(parametizedConnections.managedApiConnections)) {
      try {
        const connection = connectionsData.managedApiConnections[referenceKey].connection;
        await createAclInConnectionIfNeeded(identityWizardContext, connection.id, node);
      } catch (error) {
        throw new Error(`Error in creating access policy for connection in reference - '${referenceKey}'. ${error}`);
      }

      if (identityWizardContext?.useAdvancedIdentity) {
        managedConnection.authentication = {
          type: 'ActiveDirectoryOAuth',
          audience: 'https://management.core.windows.net/',
          credentialType: 'Secret',
          clientId: `@appsetting('${workflowAppAADClientId}')`,
          tenant: `@appsetting('${workflowAppAADTenantId}')`,
          secret: `@appsetting('${workflowAppAADClientSecret}')`,
        };
      } else {
        managedConnection.authentication = {
          type: 'ManagedServiceIdentity',
        };
      }
      settingsToExclude.push(`${referenceKey}-connectionKey`);
    }

    await writeFormattedJson(connectionsFilePath, parametizedConnections);

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
