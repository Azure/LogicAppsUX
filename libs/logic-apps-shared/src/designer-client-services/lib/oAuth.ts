import { AssertionException, AssertionErrorCode } from '../../utils/src';
import type { ConsentLink } from './base/connection';
import type { IHttpClient } from './httpClient';

export interface LoginResult {
  [x: string]: any;
  code?: string;
  error?: string;
  timerId?: number;
}

export interface IOAuthService {
  openLoginPopup(options: OAuthPopupOptions): IOAuthPopup;

  fetchConsentUrlForConnection: (connectionId: string) => Promise<string>;
  fetchConsentLinkDataForConnection: (connectionId: string) => Promise<ConsentLink>;
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
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'OAuth Service needs to be initialized before using');
  }

  return service;
};
