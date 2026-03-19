import { AssertionErrorCode, AssertionException } from '../../utils/src';
import type { IHttpClient } from './httpClient';

export interface ICognitiveServiceService {
  fetchAllCognitiveServiceAccounts(subscriptionId: string): Promise<any>;
  fetchCognitiveServiceAccountById(accountId: string): Promise<any>;
  fetchCognitiveServiceAccountKeysById(accountId: string): Promise<any>;
  fetchAllCognitiveServiceAccountDeployments(accountId: string): Promise<any>;
  fetchAllCognitiveServiceProjects(serviceAccountId: string): Promise<any>;
  fetchAllSessionPoolAccounts(subscriptionId: string): Promise<any>;
  fetchSessionPoolAccountById(accountId: string): Promise<any>;
  fetchBuiltInRoleDefinitions(): Promise<any>;
  hasRolePermission(accountId: string, roleDefinitionId: string): Promise<boolean>;
  createNewDeployment(deploymentName: string, model: string, openAIResourceId: string): Promise<any>;
  getFoundryAccessToken?(): Promise<string>;
  /** Base URL for the Foundry proxy endpoint on the Logic Apps management API. */
  foundryProxyBaseUrl?: string;
  readonly httpClient: IHttpClient;
}

let service: ICognitiveServiceService;

export const InitCognitiveServiceService = (cognitiveService: ICognitiveServiceService): void => {
  service = cognitiveService;
};

export const CognitiveServiceService = (): ICognitiveServiceService => {
  if (!service) {
    throw new AssertionException(
      AssertionErrorCode.SERVICE_NOT_INITIALIZED,
      'CognitiveServiceService needs to be initialized before using'
    );
  }

  return service;
};
