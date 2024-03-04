/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  workflowLocationKey,
  workflowManagementBaseURIKey,
  workflowResourceGroupNameKey,
  workflowSubscriptionIdKey,
  workflowTenantIdKey,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../utils/codeless/common';
import { getAuthorizationToken, getCloudHost } from '../../utils/codeless/getAuthorizationToken';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import { getAccountCredentials } from '../../utils/credentials';
import { getRandomHexString } from '../../utils/fs';
import { delay } from '@azure/ms-rest-js';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import { ExtensionCommand, ProjectName, getBaseGraphApi } from '@microsoft/vscode-extension';
import axios from 'axios';
import { writeFileSync } from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import AdmZip = require('adm-zip');

interface ConnectionsDeploymentOutput {
  connections: {
    value: Record<string, ConnectionItem>;
  };
}

interface ConnectionItem {
  runtimeUrlParameterKey: string;
  runtimeUrlParameterValue: string;
  authKeyAppsettingKey: string;
  authKey?: string;
  connectionId: string;
}

interface Deployment {
  properties: {
    provisioningState: string;
    outputs: any;
    error: any;
  };
}

class ExportEngine {
  private intlText = {
    SUCESSFULL_EXPORTED_MESSAGE: localize('workflowsExportedSuccessfully', 'The selected workflows exported successfully.'),
    DONE: localize('done', 'Done.'),
    DEPLOYING_CONNECTIONS: localize('deployConnections', 'Deploying connections ...'),
    DOWNLOADING_PACKAGE: localize('downloadingPackage', 'Downloading package ...'),
    UNZIP_PACKAGE: localize('unzipPackage', 'Unzipping package ...'),
    FETCH_CONNECTION: localize('fetchConnectionKeys', 'Retrieving connection keys ...'),
    UPDATE_FILES: localize('updateFiles', 'Updating parameters and settings ...'),
  };

  private finalStatus = {
    InProgress: 'InProgress',
    Succeeded: 'Succeeded',
    Failed: 'Failed',
  };

  public constructor(
    private getAccessToken: () => string,
    private packageUrl: string,
    private targetDirectory: string,
    private subscriptionId: string,
    private resourceGroupName: string,
    private location: string,
    private addStatus: (status: string) => void,
    private setFinalStatus: (status: string) => void,
    private baseGraphUri: string
  ) {}

  public async export(): Promise<void> {
    try {
      this.setFinalStatus(this.finalStatus.InProgress);
      this.addStatus(this.intlText.DOWNLOADING_PACKAGE);
      const flatFile = await axios.get(this.packageUrl, {
        responseType: 'arraybuffer',
        responseEncoding: 'binary',
      });

      const buffer = Buffer.from(flatFile.data);
      this.addStatus(this.intlText.DONE);
      this.addStatus(this.intlText.UNZIP_PACKAGE);
      const zip = new AdmZip(buffer);
      zip.extractAllTo(/*target path*/ this.targetDirectory, /*overwrite*/ true);
      this.addStatus(this.intlText.DONE);

      const templatePath = `${this.targetDirectory}/.development/deployment/LogicAppStandardConnections.template.json`;

      const templateExists = await fse.pathExists(templatePath);
      if (!this.resourceGroupName || !templateExists) {
        this.setFinalStatus(this.finalStatus.Succeeded);
        this.addStatus(this.intlText.SUCESSFULL_EXPORTED_MESSAGE);
        const uri: vscode.Uri = vscode.Uri.file(this.targetDirectory);
        vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
        return;
      }

      this.addStatus(this.intlText.DEPLOYING_CONNECTIONS);

      const connectionsTemplate = await fse.readJSON(templatePath);
      const parametersFile = await fse.readJSON(`${this.targetDirectory}/parameters.json`);
      const localSettingsFile = await fse.readJSON(`${this.targetDirectory}/local.settings.json`);

      try {
        await this.getResourceGroup();
      } catch (exception) {
        await this.createResourceGroup();
      }

      const output = await this.deployConnectionsTemplate(connectionsTemplate);
      this.addStatus(this.intlText.DONE);

      await this.fetchConnectionKeys(output);
      await this.updateParametersAndSettings(output, parametersFile, localSettingsFile);

      this.setFinalStatus(this.finalStatus.Succeeded);
      this.addStatus(this.intlText.SUCESSFULL_EXPORTED_MESSAGE);
      const uri: vscode.Uri = vscode.Uri.file(this.targetDirectory);
      vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
    } catch (error) {
      this.addStatus(localize('exportFailed', 'Export failed. {0}', error?.message ?? ''));
      this.setFinalStatus(this.finalStatus.Failed);
    }
  }

  private async getResourceGroup(): Promise<void> {
    const uri = `${this.baseGraphUri}/subscriptions/${this.subscriptionId}/resourcegroups/${this.resourceGroupName}?api-version=2021-04-01`;

    return axios
      .get(uri, {
        headers: {
          authorization: this.getAccessToken(),
        },
      })
      .then(({ data }) => data)
      .catch((error) => {
        throw new Error(
          localize('getResourceGroupFailure', 'Failed to get resource group "{0}". {1}', this.resourceGroupName, error.message ?? '')
        );
      });
  }

  private async createResourceGroup(): Promise<void> {
    const uri = `${this.baseGraphUri}/subscriptions/${this.subscriptionId}/resourcegroups/${this.resourceGroupName}?api-version=2021-04-01`;
    const body = {
      location: this.location,
    };

    return axios
      .put(uri, body, {
        headers: { authorization: this.getAccessToken() },
      })
      .then(({ data }) => data)
      .catch((error) => {
        throw new Error(
          localize('resourceGroupCreateFailure', 'Failed to create resource group "{0}". {1}', this.resourceGroupName, error.message ?? '')
        );
      });
  }

  private async deployConnectionsTemplate(connectionsTemplate: any): Promise<ConnectionsDeploymentOutput> {
    const uri = `${this.baseGraphUri}/subscriptions/${this.subscriptionId}/resourcegroups/${
      this.resourceGroupName
    }/providers/Microsoft.Resources/deployments/connections-${getRandomHexString(10)}?api-version=2021-04-01`;
    const body = {
      properties: {
        mode: 'Incremental',
        template: connectionsTemplate,
      },
    };

    await axios
      .put(uri, body, {
        headers: { authorization: this.getAccessToken() },
      })
      .catch((error) => {
        throw new Error(localize('templateDeploymentFailure', 'Failed to deploy connections template. {0}', error.message ?? ''));
      });

    return await this.getDeploymentOutput(uri);
  }

  private async getDeploymentOutput(uri: string): Promise<ConnectionsDeploymentOutput> {
    let tryCount = 0;
    const maxTryCount = 5 * 6;

    while (tryCount++ < maxTryCount) {
      const deployment = await this.getDeployment(uri);
      if (this.isDeploymentCompleted(deployment)) {
        if (deployment.properties.provisioningState !== 'Succeeded') {
          throw new Error(localize('deploymentFailed', 'Deployment failed. {0}', deployment.properties.error?.message ?? ''));
        }
        return deployment.properties.outputs;
      }
      await delay(1000 * 10);
    }

    throw new Error(localize('deploymentStatusMaxTryReached', 'Fetching deployment status timed out.'));
  }

  private isDeploymentCompleted(deployment: Deployment) {
    const provisioningState = deployment?.properties?.provisioningState;
    return provisioningState === 'Succeeded' || provisioningState === 'Failed' || provisioningState === 'Canceled';
  }

  private async getDeployment(uri: string): Promise<Deployment> {
    return axios
      .get(uri, { headers: { authorization: this.getAccessToken() } })
      .then(({ data }) => data)
      .catch((error) => {
        throw new Error(localize('getDeploymentFailure', 'Failed to get deployment. {1}', error.message ?? ''));
      });
  }

  private async fetchConnectionKeys(output: ConnectionsDeploymentOutput): Promise<void> {
    this.addStatus(this.intlText.FETCH_CONNECTION);
    for (const connectionKey of Object.keys(output?.connections?.value || {})) {
      const connectionItem = output.connections.value[connectionKey];
      connectionItem.authKey = await this.getConnectionKey(connectionItem.connectionId);
    }
    this.addStatus(this.intlText.DONE);
  }

  private async getConnectionKey(connectionId: string): Promise<string> {
    return axios
      .post(
        `${this.baseGraphUri}${connectionId}/listConnectionKeys?api-version=2018-07-01-preview`,
        { validityTimeSpan: '7' },
        { headers: { authorization: this.getAccessToken() } }
      )
      .then((response) => {
        return response.data?.connectionKey;
      })
      .catch((error) => {
        throw new Error(
          localize('connectionKeyFailed', 'Error in fetching connection keys for {0}. {1}', connectionId, error.message ?? '')
        );
      });
  }

  private async getTenantId(): Promise<string> {
    try {
      const subscription = await this.getSubscription();
      return subscription.tenantId;
    } catch (error) {
      this.addStatus(error.message);
      return '';
    }
  }

  private async getSubscription(): Promise<any> {
    const uri = `${this.baseGraphUri}/subscriptions/${this.subscriptionId}/?api-version=2021-04-01`;

    return axios
      .get(uri, {
        headers: { authorization: this.getAccessToken() },
      })
      .then(({ data }) => data)
      .catch((error) => {
        throw new Error(
          localize('getSubscriptionFailured', 'Failed to get subscription "{0}". {1}', this.subscriptionId, error.message ?? '')
        );
      });
  }

  private async updateParametersAndSettings(
    output: ConnectionsDeploymentOutput,
    parametersFile: any,
    localSettingsFile: any
  ): Promise<void> {
    this.addStatus(this.intlText.UPDATE_FILES);

    const { value } = output.connections;
    for (const key of Object.keys(value)) {
      const item = value[key];
      parametersFile[item.runtimeUrlParameterKey].value = item.runtimeUrlParameterValue;
      localSettingsFile.Values[item.authKeyAppsettingKey] = item.authKey;
    }

    const tenantId = await this.getTenantId();
    localSettingsFile.Values[workflowTenantIdKey] = tenantId;
    localSettingsFile.Values[workflowSubscriptionIdKey] = this.subscriptionId;
    localSettingsFile.Values[workflowResourceGroupNameKey] = this.resourceGroupName;
    localSettingsFile.Values[workflowLocationKey] = this.location;
    localSettingsFile.Values[workflowManagementBaseURIKey] = `${this.baseGraphUri}/`;

    writeFileSync(`${this.targetDirectory}/parameters.json`, JSON.stringify(parametersFile, null, 4));
    writeFileSync(`${this.targetDirectory}/local.settings.json`, JSON.stringify(localSettingsFile, null, 4));
    this.addStatus(this.intlText.DONE);
  }
}

export async function exportLogicApp(): Promise<void> {
  const panelName: string = localize('export', 'Export');
  const panelGroupKey = ext.webViewKey.export;
  let accessToken: string;
  const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
  const apiVersion = '2021-03-01';

  const dialogOptions: vscode.OpenDialogOptions = {
    canSelectMany: false,
    openLabel: 'Select folder',
    canSelectFiles: false,
    canSelectFolders: true,
  };

  const existingPanel: vscode.WebviewPanel | undefined = tryGetWebviewPanel(panelGroupKey, panelName);

  accessToken = await getAuthorizationToken(credentials);
  const cloudHost = await getCloudHost(credentials);

  if (existingPanel) {
    if (!existingPanel.active) {
      existingPanel.reveal(vscode.ViewColumn.Active);
    }

    return;
  }

  const options: vscode.WebviewOptions & vscode.WebviewPanelOptions = {
    enableScripts: true,
    retainContextWhenHidden: true,
  };

  const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel('ExportLA', `${panelName}`, vscode.ViewColumn.Active, options);
  panel.iconPath = {
    light: vscode.Uri.file(path.join(ext.context.extensionPath, 'assets', 'light', 'export.svg')),
    dark: vscode.Uri.file(path.join(ext.context.extensionPath, 'assets', 'dark', 'export.svg')),
  };
  panel.webview.html = await getWebViewHTML('vs-code-react', panel);

  let interval;

  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case ExtensionCommand.initialize: {
        panel.webview.postMessage({
          command: ExtensionCommand.initialize_frame,
          data: {
            apiVersion,
            accessToken,
            cloudHost,
            project: ProjectName.export,
            hostVersion: ext.extensionVersion,
          },
        });
        interval = setInterval(async () => {
          const updatedAccessToken = await getAuthorizationToken(credentials);
          if (updatedAccessToken !== accessToken) {
            accessToken = updatedAccessToken;
            panel.webview.postMessage({
              command: ExtensionCommand.update_access_token,
              data: {
                accessToken,
              },
            });
          }
        }, 5000);
        break;
      }
      case ExtensionCommand.select_folder: {
        vscode.window.showOpenDialog(dialogOptions).then((fileUri) => {
          if (fileUri && fileUri[0]) {
            panel.webview.postMessage({
              command: ExtensionCommand.update_export_path,
              data: {
                targetDirectory: {
                  fsPath: fileUri[0].fsPath,
                  path: fileUri[0].path,
                },
              },
            });
          }
        });
        break;
      }
      case ExtensionCommand.export_package: {
        const { targetDirectory, packageUrl, selectedSubscription, resourceGroupName, location } = message;
        const baseGraphUri = getBaseGraphApi(cloudHost);
        const engine = new ExportEngine(
          () => accessToken,
          packageUrl,
          targetDirectory.fsPath,
          selectedSubscription,
          resourceGroupName,
          location,
          (status: string) => {
            panel.webview.postMessage({
              command: ExtensionCommand.add_status,
              data: {
                status,
              },
            });
          },
          (status: string) => {
            panel.webview.postMessage({
              command: ExtensionCommand.set_final_status,
              data: {
                status,
              },
            });
          },
          baseGraphUri
        );
        engine.export();
        break;
      }
      default:
        break;
    }
  }, ext.context.subscriptions);

  panel.onDidDispose(
    () => {
      removeWebviewPanelFromCache(panelGroupKey, panelName);
      clearInterval(interval);
    },
    null,
    ext.context.subscriptions
  );
  cacheWebviewPanel(panelGroupKey, panelName, panel);
}
