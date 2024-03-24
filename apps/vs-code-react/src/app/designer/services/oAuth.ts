import { JwtTokenConstants, JwtTokenHelper } from './JwtHelper';
import type { IOAuthPopup, IOAuthService, OAuthPopupOptions } from '@microsoft/logic-apps-shared';
import { ExtensionCommand } from '@microsoft/vscode-extension';

export interface LoginResult {
  [x: string]: any;
  code?: string;
  error?: string;
  timerId?: number;
}

export interface IOAuthServiceOptions {
  vscode?: any;
  authToken: string;
  apiVersion: string;
  panelId: string;
  baseUrl: string;
  httpClient: any;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  oauthRedirectUrl: string;
}

interface ConfirmConsentCodeRequest {
  code: string;
  objectId: string;
  tenantId: string;
}

interface ConsentLinkRequest {
  parameters: ConsentLinkObject[];
}

interface ConsentLinkObject {
  objectId?: string;
  parameterName?: string;
  redirectUrl: string;
  tenantId?: string;
}

interface OAuthServiceOptions {
  consentUrl: string;
  panelId: string;
  vscode: any;
}

class OAuthPopup {
  public closed: boolean;
  public loginPromise: Promise<LoginResult>;
  private _timer: any;
  private _msg?: any;
  constructor(private options: OAuthServiceOptions) {
    const { consentUrl, vscode } = options;
    this.closed = false;
    this.loginPromise = this.login(consentUrl, vscode);
  }

  public login = (consentUrl: string, vscode: any): Promise<LoginResult> => {
    vscode.postMessage({ command: ExtensionCommand.openOauthLoginPopup, url: consentUrl });
    global.addEventListener('message', this._handleMessage);
    let timeoutCounter = 0;
    return new Promise<LoginResult>((resolve, reject) => {
      this._timer = setInterval(() => {
        timeoutCounter++;
        this.handlePopup(resolve, reject, timeoutCounter);
      }, 1000);
    });
  };

  private handlePopup(resolve: any, reject: any, timeoutCounter: number) {
    if (this.closed) {
      if (this._msg.code) {
        resolve({ code: this._msg.code });
      } else {
        reject({
          name: 'Error',
          message: 'Oauth Popup closed without authenticating',
        });
      }
      clearInterval(this._timer);
    } else if (timeoutCounter >= 300) {
      reject({
        name: 'Error',
        message: 'Timed out',
      });
      clearInterval(this._timer);
    }
  }

  // Visual Studio Code does not support closing windows opened with vscode.env.openExternal.
  public close(): void {
    this.closed = true;
    global.removeEventListener('message', this._handleMessage);
  }

  // Handle messages posted by the extension to the Webview window when the openExternal window processes actions in the authorization popup.
  public _handleMessage = ({ data }: any): void => {
    // tslint:disable-line: no-any
    if (this.closed || !data || typeof data !== 'object' || !data.value || this.options.panelId !== data.value.pid) {
      return;
    }

    switch (data.command) {
      // When the extension receives the result from redirect url it will post a 'CompleteOauthLogin' message with data.
      case ExtensionCommand.completeOauthLogin:
        this._msg = data.value;
        this.close();
        break;

      default:
        break;
    }
  };
}

export class BaseOAuthService implements IOAuthService {
  private _redirectUrl: string;
  constructor(private readonly options: IOAuthServiceOptions) {
    const { oauthRedirectUrl, panelId } = options;
    this._redirectUrl =
      oauthRedirectUrl && oauthRedirectUrl.indexOf('?') > -1 ? `${oauthRedirectUrl}&pid=${panelId}` : `${oauthRedirectUrl}?pid=${panelId}`;
  }

  public openLoginPopup({ consentUrl }: OAuthPopupOptions): IOAuthPopup {
    return new OAuthPopup({
      consentUrl,
      vscode: this.options.vscode,
      panelId: this.options.panelId,
    });
  }

  private getConnectionRequestPath(connectionName: string): string {
    const { subscriptionId, resourceGroup } = this.options;
    return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections/${connectionName}`;
  }

  public async confirmConsentCodeForConnection(connectionName: string, code: string) {
    if (code === 'valid') {
      return null;
    }
    const { baseUrl, httpClient, apiVersion } = this.options;
    const hostName = baseUrl.split('/subscriptions')[0];
    const uri = `${hostName}${this.getConnectionRequestPath(connectionName)}/confirmConsentCode`;

    const helper = JwtTokenHelper.createInstance();
    const tokenObject = helper.extractJwtTokenPayload(this.options.authToken);
    const requestBody: ConfirmConsentCodeRequest = {
      code,
      objectId: tokenObject[JwtTokenConstants.objectId],
      tenantId: tokenObject[JwtTokenConstants.tenantId],
    };

    return httpClient.post({
      content: requestBody,
      uri,
      queryParameters: {
        'api-version': apiVersion,
      },
    });
  }

  public async fetchConsentUrlForConnection(connectionName: string) {
    const { baseUrl, httpClient, apiVersion } = this.options;
    const hostName = baseUrl.split('/subscriptions')[0];
    const uri = `${hostName}${this.getConnectionRequestPath(connectionName)}/listConsentLinks`;

    const helper = JwtTokenHelper.createInstance();
    const tokenObject = helper.extractJwtTokenPayload(this.options.authToken);
    const requestBody: ConsentLinkRequest = {
      parameters: [
        {
          objectId: tokenObject[JwtTokenConstants.objectId],
          parameterName: 'token',
          redirectUrl: this._redirectUrl,
          tenantId: tokenObject[JwtTokenConstants.tenantId],
        },
      ],
    };

    try {
      const response = await httpClient.post({
        content: requestBody,
        uri,
        queryParameters: {
          'api-version': apiVersion,
        },
      });

      if (response?.value[0]?.link) {
        return response.value[0].link;
      } else {
        // TODO: Add error handling
        throw new Error('Error fetching consent URL');
      }
    } catch (error) {
      // TODO: Add error handling
      throw new Error(error as any);
    }
  }
}
