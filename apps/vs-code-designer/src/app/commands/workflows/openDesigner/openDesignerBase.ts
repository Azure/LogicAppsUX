/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { tryGetWebviewPanel } from '../../../utils/codeless/common';
import { getWebViewHTML } from '../../../utils/codeless/getWebViewHTML';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import { ResolutionService, getRecordEntry, isEmptyString } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { Artifacts, AzureConnectorDetails, ConnectionsData, FileDetails, Parameter } from '@microsoft/vscode-extension-logic-apps';
import { azurePublicBaseUrl, workflowManagementBaseURIKey } from '../../../../constants';
import type { WebviewPanel, WebviewOptions, WebviewPanelOptions } from 'vscode';

export interface IDesingerOptions {
  references?: any;
  connectionsData: string;
  parametersData: Record<string, Parameter>;
  localSettings: { [key: string]: string };
  artifacts: Artifacts;
  azureDetails: AzureConnectorDetails;
  workflowDetails?: Record<string, any>;
}

export abstract class OpenDesignerBase {
  protected workflowName: string;
  protected panelName: string;
  protected apiVersion: string;
  protected panelGroupKey: string;
  protected baseUrl: string;
  protected workflowRuntimeBaseUrl: string;
  protected connectionData: ConnectionsData;
  protected panel: WebviewPanel;
  protected apiHubServiceDetails: Record<string, any>;
  protected readonly context: IActionContext | IAzureConnectorsContext;
  protected readOnly: boolean;
  protected isLocal: boolean;
  protected isMonitoringView: boolean;
  protected appSettings: Record<string, string>;
  protected workflowDetails: Record<string, any>;
  protected oauthRedirectUrl?: string;
  protected schemaArtifacts?: FileDetails[] | undefined;
  protected mapArtifacts?: Record<string, FileDetails[]> | undefined;
  protected unitTestName: string;
  protected isUnitTest: boolean;
  protected unitTestDefinition: any;
  protected runId?: string;

  protected constructor(
    context: IActionContext | IAzureConnectorsContext,
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

  protected abstract createPanel(): Promise<void>;

  protected getExistingPanel(): WebviewPanel | undefined {
    return tryGetWebviewPanel(this.panelGroupKey, this.panelName);
  }

  protected getPanelOptions(): WebviewOptions & WebviewPanelOptions {
    return {
      enableScripts: true,
      retainContextWhenHidden: true,
    };
  }

  protected sendMsgToWebview(msg: any) {
    this.panel.webview.postMessage(msg);
  }

  protected async getWebviewContent(options: IDesingerOptions): Promise<string> {
    const { parametersData, localSettings, artifacts, azureDetails } = options;
    let { connectionsData } = options;

    const mapArtifacts = {};
    const parameters = {};
    connectionsData = this.getInterpolateConnectionData(connectionsData);

    Object.keys(parametersData).forEach((key) => {
      parameters[key] = parametersData[key].value;
    });

    for (const extension of Object.keys(artifacts.maps)) {
      const extensionName = extension.substr(1);
      mapArtifacts[extensionName] = artifacts.maps[extension];
    }

    const parametersResolutionService = new ResolutionService(parameters, localSettings);
    const parsedConnections = isEmptyString(connectionsData) ? {} : JSON.parse(connectionsData);
    const resolvedConnections: ConnectionsData = parametersResolutionService.resolve(parsedConnections);

    this.connectionData = resolvedConnections;
    this.apiHubServiceDetails = this.getApiHubServiceDetails(azureDetails, localSettings);
    this.mapArtifacts = mapArtifacts;
    this.schemaArtifacts = artifacts.schemas;

    return await getWebViewHTML('vs-code-react', this.panel);
  }

  private addCurlyBraces(root: string) {
    let interpolationString = root;
    let stringLength = interpolationString.length;
    let resolvedString = '';

    for (let i = 0; i < stringLength; i++) {
      const canHavekeyWord = i + 12 <= stringLength;

      if (interpolationString[i] === '@' && canHavekeyWord && this.haveKeyWord(interpolationString.substring(i, i + 12))) {
        resolvedString += interpolationString[i] + '{';
        const closeTagIndex = interpolationString.indexOf(')', i);
        interpolationString =
          interpolationString.substring(0, closeTagIndex + 1) +
          '}' +
          interpolationString.substring(closeTagIndex + 1, interpolationString.length);
        stringLength = interpolationString.length;
      } else {
        resolvedString += interpolationString[i];
      }
    }
    return resolvedString;
  }

  private haveKeyWord(keyword: string): boolean {
    return keyword === '@parameters(' || keyword === '@appsetting(';
  }

  protected getInterpolateConnectionData(connectionsData: string) {
    if (!connectionsData) {
      return connectionsData;
    }
    const parseConnectionsData: ConnectionsData = JSON.parse(connectionsData);
    const managedApiConnections = Object.keys(parseConnectionsData?.managedApiConnections ?? {});

    managedApiConnections?.forEach((apiConnection: any) => {
      const connectionValue = parseConnectionsData?.managedApiConnections[apiConnection] as any;
      if (connectionValue.api && connectionValue.api.id) {
        connectionValue.api.id = this.addCurlyBraces(connectionValue.api.id);
      }
      if (connectionValue.connection && connectionValue.connection.id) {
        connectionValue.connection.id = this.addCurlyBraces(connectionValue.connection.id);
      }
    });

    return JSON.stringify(parseConnectionsData);
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
}
