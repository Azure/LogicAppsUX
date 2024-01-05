export interface LoginResult {
  [x: string]: any;
  code?: string;
  error?: string;
  timerId?: number;
}

export interface IOAuthService {
  openLoginPopup(options: OAuthPopupOptions): IOAuthPopup;

  fetchConsentUrlForConnection: (connectionId: string) => Promise<string>;
  confirmConsentCodeForConnection: (connectionId: string, code: string) => Promise<any>;
}

export interface IOAuthServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: any;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  tenantId?: string;
  objectId?: string;
}

export interface IOAuthPopup {
  [x: string]: any;
  loginPromise: Promise<any>;
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

export interface ConsentLink {
  link: string;
  displayName?: string;
  status?: string;
}

export interface OAuthPopupOptions {
  consentUrl: string;
  redirectUrl: string;
}

const popupId = 'msla-logicapps-oauthpopup';
const redirectUrl = `https://ema.hosting.portal.azure.net/ema/Content/2.30508.1.8/Html/authredirectv2.html?pid=${popupId}`;

export class StandaloneOAuthPopup implements IOAuthPopup {
  public loginPromise: Promise<LoginResult>;

  private _popupId: string;
  private _popupWindow: Window | undefined;
  private _timer: any;
  private _msg?: string;
  constructor(options: OAuthPopupOptions) {
    const { consentUrl } = options;
    this._popupId = popupId;
    this.loginPromise = this.login(consentUrl);
  }

  private login = async (consentUrl: string): Promise<LoginResult> => {
    const authUrl = new URL(consentUrl);

    const windowWidth = 600;
    const windowHeight = 600;
    const windowOptions = Object.entries({
      scrollbars: true,
      resizable: true,
      width: windowWidth,
      height: windowHeight,
      popup: true,
    })
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    const oAuthWindow = window.open(authUrl.href, this._popupId, windowOptions);
    if (!oAuthWindow) throw new Error('The browser has blocked the popup window.');
    this._popupWindow = oAuthWindow;

    if (!this._popupWindow) {
      throw new Error('The browser has blocked the popup window.');
    }

    // eslint-disable-next-line no-restricted-globals
    this._popupWindow?.moveBy((screen.width - windowWidth) / 2, (screen.height - windowHeight) / 2);

    let timeoutCounter = 0;
    const listener = (event: MessageEvent) => {
      const origin = event.origin;
      const redirectOrigin = new URL(redirectUrl).origin;
      if (origin !== redirectOrigin) return;
      this._msg = decodeURIComponent(event.data);
      window.removeEventListener('message', listener);
      this._popupWindow?.close();
    };
    window.addEventListener('message', listener);
    return new Promise<LoginResult>((resolve, reject) => {
      this._timer = window.setInterval(() => {
        timeoutCounter++;
        this.handlePopup(resolve, reject, timeoutCounter);
      }, 1000);
    });
  };

  private handlePopup(resolve: any, reject: any, timeoutCounter: number) {
    if (this._popupWindow?.closed) {
      const storageValue = this._msg ? decodeURIComponent(this._msg) : undefined;

      if (storageValue) {
        resolve(JSON.parse(storageValue));
      } else {
        reject({
          name: 'Error',
          message: 'The browser is closed',
        });
      }
      clearInterval(this._timer);
    } else if (timeoutCounter >= 300) {
      reject({
        name: 'Error',
        message: 'Timeout',
      });
      clearInterval(this._timer);
    }
  }
}

export class StandaloneOAuthService implements IOAuthService {
  constructor(private readonly options: IOAuthServiceOptions) {}

  public openLoginPopup(options: OAuthPopupOptions): IOAuthPopup {
    return new StandaloneOAuthPopup(options);
  }

  private getConnectionRequestPath(connectionName: string): string {
    const { subscriptionId, resourceGroup } = this.options;
    return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections/${connectionName}`;
  }

  public async confirmConsentCodeForConnection(connectionName: string, code: string) {
    const { baseUrl, httpClient, apiVersion, objectId = '', tenantId = '' } = this.options;
    const hostName = baseUrl.split('/subscriptions')[0];
    const uri = `${hostName}${this.getConnectionRequestPath(connectionName)}/confirmConsentCode`;

    const requestBody: ConfirmConsentCodeRequest = {
      code,
      objectId,
      tenantId,
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
    const { baseUrl, httpClient, apiVersion, tenantId, objectId } = this.options;
    const hostName = baseUrl.split('/subscriptions')[0];
    const uri = `${hostName}${this.getConnectionRequestPath(connectionName)}/listConsentLinks`;

    const requestBody: ConsentLinkRequest = {
      parameters: [
        {
          parameterName: 'token',
          redirectUrl,
          tenantId,
          objectId,
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

      console.log('response', response);

      if (response?.value[0]?.link) {
        return response.value[0].link;
      } else {
        // TODO: Add error handling
        throw new Error('Error fetching consent URL');
      }
    } catch (error) {
      console.error(error);
      // TODO: Add error handling
      throw new Error(error as any);
    }
  }
}
