import { tryGetWebviewPanel } from '../../../utils/codeless/common';
import type { WebviewPanel } from 'vscode';

export abstract class OpenDesignerBase {
  protected workflowName: string;
  protected panelName: string;
  protected apiVersion: string;
  protected panelGroupKey: string;

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
