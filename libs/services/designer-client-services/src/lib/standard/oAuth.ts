import type { IOAuthPopup, LoginResult, IOAuthService, IOAuthServiceOptions, OAuthPopupOptions } from '../oAuth';
import { ArgumentException } from '@microsoft-logic-apps/utils';

export class OAuthPopup implements IOAuthPopup {
  public loginPromise: Promise<LoginResult>;

  constructor(options: OAuthPopupOptions) {
    const { consentUrl, redirectUrl } = options;
    const windowName: string = Date.now().toString();
    const authUrl = `${consentUrl}&redirect_uri=${encodeURIComponent(redirectUrl)}`;
    const oAuthWindow = window.open(authUrl, windowName, 'scrollbars=1, resizable=1, width=500, height=600, popup=1');
    if (!oAuthWindow) throw new Error('The browser has blocked the popup window.');

    this.loginPromise = new Promise<LoginResult>((resolve) => {
      // Check for authorization status every 1000 ms.
      const timerId = setInterval(() => {
        try {
          const url = new URL(oAuthWindow.document.URL);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (code) resolve({ timerId, code });
          else if (error) resolve({ timerId, error });
          else if (oAuthWindow?.closed) {
            resolve({
              timerId,
              error: 'The popup window has been closed.',
            });
          }
        } catch {
          // Do nothing
        }
      }, 1000);

      // If no activity after 60 seconds, turn off the timer and close the auth window.
      setTimeout(() => resolve({ timerId }), 60000);
    });

    this.loginPromise.then((authorizationResult) => {
      console.log('RESULT OF LOGIN PROMISE', JSON.stringify(authorizationResult));
      clearInterval(authorizationResult.timerId);
      oAuthWindow?.close();
    });
  }
}

export class StandardOAuthService implements IOAuthService {
  constructor(private readonly options: IOAuthServiceOptions) {
    const { apiVersion, baseUrl, httpClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!httpClient) {
      throw new ArgumentException('httpClient required');
    }
  }

  public confirmConsentCodeForConnection(_connectionId: string, _code: string) {
    return new Promise(() => null);
  }

  public fetchConsentUrlForConnection(_connectionId: string, _redirectUrl: string) {
    return new Promise<string>(() => 'null');
  }

  public openLoginPopup(options: OAuthPopupOptions): IOAuthPopup {
    return new OAuthPopup(options);
  }
}
