import type { IHttpClient } from './httpClient';
import { AssertionException, AssertionErrorCode } from '@microsoft-logic-apps/utils';

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
  httpClient: IHttpClient;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

export interface IOAuthPopup {
  [x: string]: any;
  loginPromise: Promise<LoginResult>;
}

export interface OAuthPopupOptions {
  consentUrl: string;
}

let service: IOAuthService;

export const InitOAuthService = (oAuthService: IOAuthService): void => {
  service = oAuthService;
};

export const OAuthService = (): IOAuthService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ConnectionService need to be initialized before using');
  }

  return service;
};
