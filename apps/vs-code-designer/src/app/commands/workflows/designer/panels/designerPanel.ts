/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { tryGetWebviewPanel } from '../../../../utils/codeless/common';
import { getWebViewHTML } from '../../../../utils/codeless/getWebViewHTML';
import { getRecordEntry, isEmptyString, resolveConnectionsReferences } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { Artifacts, AzureConnectorDetails, ConnectionsData, FileDetails, Parameter } from '@microsoft/vscode-extension-logic-apps';
import {
  azurePublicBaseUrl,
  workflowManagementBaseURIKey,
  designerVersionSetting,
  defaultDesignerVersion,
  suppressDesignerVersionNotification,
} from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import type { WebviewPanel, WebviewOptions, WebviewPanelOptions } from 'vscode';
import { workspace, window, ConfigurationTarget } from 'vscode';

export interface IDesignerOptions {
  references?: any;
  connectionsData: string;
  parametersData: Record<string, Parameter>;
  localSettings: { [key: string]: string };
  artifacts: Artifacts;
  azureDetails: AzureConnectorDetails;
  workflowDetails?: Record<string, any>;
}

export abstract class DesignerPanel {
  protected readonly context: IActionContext;
  protected workflowName: string;
  protected panelName: string;
  protected apiVersion: string;
  protected panelGroupKey: string;
  protected baseUrl?: string;
  protected workflowRuntimeBaseUrl?: string;
  protected connectionData?: ConnectionsData;
  protected panel?: WebviewPanel;
  protected apiHubServiceDetails?: Record<string, any>;
  protected readOnly: boolean;
  protected isLocal: boolean;
  protected isMonitoringView: boolean;
  protected oauthRedirectUrl?: string;
  protected schemaArtifacts?: FileDetails[];
  protected mapArtifacts?: Record<string, FileDetails[]>;
  protected runId?: string;

  protected constructor(
    context: IActionContext,
    workflowName: string,
    panelName: string,
    apiVersion: string,
    panelGroupKey: string,
    readOnly: boolean,
    isLocal: boolean,
    isMonitoringView: boolean,
    runId: string
  ) {
    this.context = context;
    this.workflowName = workflowName;
    this.panelName = panelName;
    this.apiVersion = apiVersion;
    this.panelGroupKey = panelGroupKey;
    this.readOnly = readOnly;
    this.isLocal = isLocal;
    this.isMonitoringView = isMonitoringView;
    this.runId = runId;
  }

  public abstract create(): Promise<void>;

  protected getExistingPanel(): WebviewPanel | undefined {
    return tryGetWebviewPanel(this.panelGroupKey, this.panelName);
  }

  protected getPanelOptions(): WebviewOptions & WebviewPanelOptions {
    return {
      enableScripts: true,
      retainContextWhenHidden: true,
    };
  }

  protected async getWebviewContent(options: IDesignerOptions): Promise<string> {
    if (!this.panel) {
      throw new Error('Webview panel is not initialized.');
    }

    const { parametersData, localSettings, artifacts, azureDetails } = options;
    let { connectionsData } = options;

    const mapArtifacts: Record<string, FileDetails[]> = {};
    connectionsData = this.getInterpolateConnectionData(connectionsData);

    for (const extension of Object.keys(artifacts.maps)) {
      const extensionName = extension.substr(1);
      mapArtifacts[extensionName] = artifacts.maps[extension];
    }

    const resolvedConnections: ConnectionsData = isEmptyString(connectionsData)
      ? {}
      : resolveConnectionsReferences(connectionsData, parametersData, localSettings);

    this.connectionData = resolvedConnections;
    this.apiHubServiceDetails = this.getApiHubServiceDetails(azureDetails, localSettings);
    this.mapArtifacts = mapArtifacts;
    this.schemaArtifacts = artifacts.schemas ?? [];

    return await getWebViewHTML('vs-code-react', this.panel);
  }

  protected getInterpolateConnectionData(connectionsJson: string): string {
    if (!connectionsJson) {
      return connectionsJson;
    }

    const connectionsData: ConnectionsData = JSON.parse(connectionsJson);
    const managedApiConnections = Object.keys(connectionsData?.managedApiConnections ?? {});

    managedApiConnections.forEach((apiConnection: any) => {
      const connectionValue = connectionsData?.managedApiConnections?.[apiConnection];
      if (!connectionValue) {
        return;
      }

      if (connectionValue.api && connectionValue.api.id) {
        connectionValue.api.id = this.addCurlyBraces(connectionValue.api.id);
      }
      if (connectionValue.connection && connectionValue.connection.id) {
        connectionValue.connection.id = this.addCurlyBraces(connectionValue.connection.id);
      }
    });

    return JSON.stringify(connectionsData);
  }

  private addCurlyBraces(root: string) {
    let interpolationString = root;
    let stringLength = interpolationString.length;
    let resolvedString = '';

    for (let i = 0; i < stringLength; i++) {
      const canHavekeyWord = i + 12 <= stringLength;

      if (interpolationString[i] === '@' && canHavekeyWord && this.isTemplateKeyword(interpolationString.substring(i, i + 12))) {
        resolvedString += `${interpolationString[i]}{`;
        const closeTagIndex = interpolationString.indexOf(')', i);
        interpolationString = `${interpolationString.substring(0, closeTagIndex + 1)}}${interpolationString.substring(
          closeTagIndex + 1,
          interpolationString.length
        )}`;
        stringLength = interpolationString.length;
      } else {
        resolvedString += interpolationString[i];
      }
    }
    return resolvedString;
  }

  private isTemplateKeyword(str: string): boolean {
    return str === '@parameters(' || str === '@appsetting(';
  }

  protected getApiHubServiceDetails(azureDetails: AzureConnectorDetails, localSettings: Record<string, any>) {
    const isApiHubEnabled = azureDetails.enabled;
    const workflowManagementBaseUrl = getRecordEntry(localSettings, workflowManagementBaseURIKey) ?? azurePublicBaseUrl;

    return isApiHubEnabled
      ? {
          apiVersion: '2018-07-01-preview',
          baseUrl: workflowManagementBaseUrl,
          subscriptionId: azureDetails.subscriptionId,
          location: azureDetails.location,
          resourceGroup: azureDetails.resourceGroupName,
          tenantId: azureDetails.tenantId,
          resourceGroupName: azureDetails.resourceGroupName,
          getAccessToken: () => Promise.resolve(azureDetails.accessToken),
        }
      : undefined;
  }

  protected normalizeLocation(location: string): string {
    if (!location) {
      return '';
    }
    return location.toLowerCase().replace(/ /g, '');
  }

  protected async showDesignerVersionNotification(): Promise<void> {
    const isSuppressed = ext.context.globalState.get<boolean>(suppressDesignerVersionNotification) === true;
    if (isSuppressed) {
      return;
    }

    const currentVersion = this.getDesignerVersion();
    if (currentVersion === 1) {
      await this.showUpgradeDesignerNotification();
    } else {
      await this.showDowngradeDesignerNotification();
    }
  }

  protected getDesignerVersion(): number {
    const config = workspace.getConfiguration(ext.prefix);
    return config.get<number>(designerVersionSetting) ?? defaultDesignerVersion;
  }

  private async showUpgradeDesignerNotification(): Promise<void> {
    const config = workspace.getConfiguration(ext.prefix);
    const enablePreview = localize('enablePreview', 'Enable preview');
    const dontShowAgain = localize('dontShowAgain', "Don't show again");
    const message = localize('previewAvailable', 'A new Logic Apps experience is available for preview!');

    const selection = await window.showInformationMessage(message, enablePreview, dontShowAgain);
    if (selection === dontShowAgain) {
      await ext.context.globalState.update(suppressDesignerVersionNotification, true);
    } else if (selection === enablePreview) {
      await config.update(designerVersionSetting, 2, ConfigurationTarget.Global);
      const closeButton = localize('close', 'Close');
      const reopenMessage = localize('closeToApply', 'Setting updated. Please close and reopen the workflow to apply the new experience.');
      const reopenSelection = await window.showInformationMessage(reopenMessage, closeButton);
      if (reopenSelection === closeButton) {
        this.panel?.dispose();
      }
    }
  }

  private async showDowngradeDesignerNotification(): Promise<void> {
    const config = workspace.getConfiguration(ext.prefix);
    const goBack = localize('goBack', 'Go back to previous version');
    const dontShowAgain = localize('dontShowAgain', "Don't show again");
    const message = localize('previewingNew', 'You are previewing the new Logic Apps experience.');

    const selection = await window.showInformationMessage(message, goBack, dontShowAgain);
    if (selection === goBack) {
      await config.update(designerVersionSetting, 1, ConfigurationTarget.Global);
      const closeButton = localize('close', 'Close');
      const reopenMessage = localize('closeToApply', 'Setting updated. Please close and reopen the workflow to apply the change.');
      const reopenSelection = await window.showInformationMessage(reopenMessage, closeButton);
      if (reopenSelection === closeButton) {
        this.panel?.dispose();
      }
    } else if (selection === dontShowAgain) {
      await ext.context.globalState.update(suppressDesignerVersionNotification, true);
    }
  }
}
