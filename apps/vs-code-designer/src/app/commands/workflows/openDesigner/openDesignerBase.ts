import { ext } from '../../../../extensionVariables';
import { tryGetWebviewPanel } from '../../../utils/codeless/common';
import type { Artifacts, Parameter } from '@microsoft-logic-apps/utils';
import { promises as fs } from 'fs';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { ResolutionService } from 'libs/parsers/src/lib/resolution-service/resolution-service';
import { join } from 'path';
import { Uri } from 'vscode';
import type { WebviewPanel } from 'vscode';

export interface IDesingerOptions {
  references?: any;
  connectionsData: string;
  parametersData: Record<string, Parameter>;
  localSettings: { [key: string]: string };
  artifacts: Artifacts;
}

export abstract class OpenDesignerBase {
  protected workflowName: string;
  protected panelName: string;
  protected apiVersion: string;
  protected panelGroupKey: string;
  protected baseUrl: string;
  protected connectionReferences: any;
  protected panel: WebviewPanel;

  protected constructor(workflowName: string, panelName: string, apiVersion: string, panelGroupKey: string) {
    this.workflowName = workflowName;
    this.panelName = panelName;
    this.apiVersion = apiVersion;
    this.panelGroupKey = panelGroupKey;
  }

  protected abstract createPanel(): Promise<void>;

  protected getExistingPanel(): WebviewPanel | undefined {
    return tryGetWebviewPanel(this.panelGroupKey, this.panelName);
  }

  protected async getWebviewContent(options: IDesingerOptions): Promise<string> {
    const { parametersData, localSettings, artifacts } = options;
    let { connectionsData } = options;

    const mapArtifacts = {};

    const parameters = {};
    connectionsData = this.getInterpolateConnectionData(connectionsData);

    Object.keys(parametersData).forEach((key) => {
      parameters[key] = parametersData[key].value;
    });

    for (const extension of Object.keys(artifacts.maps)) {
      const extensionName = extension.substr(1);
      mapArtifacts[extensionName] = artifacts.maps[extension].map((fileDetails) => ({
        value: fileDetails.fileName,
        displayName: fileDetails.name,
      }));
    }

    const parametersResolutionService = new ResolutionService(parameters, localSettings);
    const resolvedConnections = parametersResolutionService.resolve(connectionsData);

    this.connectionReferences = this.getConnectionReferences(resolvedConnections);

    // Get webview content, converting links to VS Code URIs
    const indexPath = join(ext.context.extensionPath, 'webview/index.html');
    const html = await fs.readFile(indexPath, 'utf-8');
    // 1. Get all link prefixed by href or src
    const matchLinks = /(href|src)="([^"]*)"/g;
    // 2. Transform the result of the regex into a vscode's URI format
    const toUri = (_, prefix: 'href' | 'src', link: string) => {
      // For
      if (link === '#') {
        return `${prefix}="${link}"`;
      }
      // For scripts & links
      const path = join(ext.context.extensionPath, 'webview', link);
      const uri = Uri.file(path);
      return `${prefix}="${this.panel.webview.asWebviewUri(uri)}"`;
    };

    return html.replace(matchLinks, toUri);
  }

  private getConnectionReferences(connectionsData) {
    const references = {};
    const connectionReferences = connectionsData?.managedApiConnections || {};
    const functionConnections = connectionsData?.functionConnections || {};
    const serviceProviderConnections = connectionsData?.serviceProviderConnections || {};

    for (const connectionReferenceKey of Object.keys(connectionReferences)) {
      const { connection, api } = connectionReferences[connectionReferenceKey];
      references[connectionReferenceKey] = {
        connectionId: connection ? connection.id : '',
        connectionName: connection && connection.id ? connection.id.split('/').slice(-1)[0] : '',
        id: api ? api.id : '',
      };
    }

    for (const connectionKey of Object.keys(functionConnections)) {
      references[connectionKey] = {
        connectionId: '/' + connectionKey,
        connectionName: connectionKey,
        id: '/connectionProviders/azureFunctionOperation',
      };
    }

    for (const connectionKey of Object.keys(serviceProviderConnections)) {
      references[connectionKey] = {
        connectionId: '/' + connectionKey,
        connectionName: connectionKey,
        id: serviceProviderConnections[connectionKey].serviceProvider.id,
      };
    }

    return references;
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
    const parseConnectionsData = JSON.parse(connectionsData);
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
}
