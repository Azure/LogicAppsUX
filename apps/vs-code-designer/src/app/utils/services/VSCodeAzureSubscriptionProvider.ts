/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  AzureDevOpsSubscriptionProvider,
  VSCodeAzureSubscriptionProvider,
  type AzureDevOpsSubscriptionProviderInitializer,
  type AzureSubscriptionProvider,
} from '@microsoft/vscode-azext-azureauth';

let vscodeAzureSubscriptionProvider: VSCodeAzureSubscriptionProvider | undefined;
let azureDevOpsSubscriptionProvider: AzureDevOpsSubscriptionProvider | undefined;

export const createVSCodeAzureSubscriptionProvider = (): VSCodeAzureSubscriptionProvider => {
  vscodeAzureSubscriptionProvider ??= new VSCodeAzureSubscriptionProvider();
  return vscodeAzureSubscriptionProvider;
};

export type AzureDevOpsFederatedCredentialConfig = AzureDevOpsSubscriptionProviderInitializer;

const hasValue = (value: string | undefined): value is string => !!value;

const shouldUseAzureDevOpsFederatedCredentials = (env: NodeJS.ProcessEnv): boolean => {
  return (
    hasValue(env.FC_SERVICE_CONNECTION_NAME) ||
    !/^(false|0)?$/i.test(env.AzCode_UseAzureFederatedCredentials ?? '') ||
    hasValue(env.FC_SERVICE_CONNECTION_ID) ||
    hasValue(env.FC_SERVICE_CONNECTION_TENANT_ID) ||
    hasValue(env.FC_SERVICE_CONNECTION_CLIENT_ID) ||
    hasValue(env.AzCode_ServiceConnectionID) ||
    hasValue(env.AzCode_ServiceConnectionDomain) ||
    hasValue(env.AzCode_ServiceConnectionClientID)
  );
};

export const getAzureDevOpsFederatedCredentialConfig = (
  env: NodeJS.ProcessEnv = process.env
): AzureDevOpsFederatedCredentialConfig | undefined => {
  if (!shouldUseAzureDevOpsFederatedCredentials(env)) {
    return undefined;
  }

  const serviceConnectionId = env.FC_SERVICE_CONNECTION_ID ?? env.AzCode_ServiceConnectionID;
  const domain = env.FC_SERVICE_CONNECTION_TENANT_ID ?? env.AzCode_ServiceConnectionDomain;
  const clientId = env.FC_SERVICE_CONNECTION_CLIENT_ID ?? env.AzCode_ServiceConnectionClientID;

  if (!serviceConnectionId || !domain || !clientId) {
    throw new Error(
      [
        'Using Azure DevOps federated credentials, but the federated service connection is not fully configured.',
        `FC_SERVICE_CONNECTION_ID/AzCode_ServiceConnectionID: ${serviceConnectionId ? 'set' : 'missing'}`,
        `FC_SERVICE_CONNECTION_TENANT_ID/AzCode_ServiceConnectionDomain: ${domain ? 'set' : 'missing'}`,
        `FC_SERVICE_CONNECTION_CLIENT_ID/AzCode_ServiceConnectionClientID: ${clientId ? 'set' : 'missing'}`,
      ].join('\n')
    );
  }

  return { serviceConnectionId, domain, clientId };
};

export const isAzureDevOpsFederatedCredentialsConfigured = (): boolean => {
  return !!getAzureDevOpsFederatedCredentialConfig();
};

export const createAzureSubscriptionProvider = async (): Promise<AzureSubscriptionProvider> => {
  const azureDevOpsConfig = getAzureDevOpsFederatedCredentialConfig();

  if (!azureDevOpsConfig) {
    return createVSCodeAzureSubscriptionProvider();
  }

  if (!azureDevOpsSubscriptionProvider) {
    azureDevOpsSubscriptionProvider = new AzureDevOpsSubscriptionProvider(azureDevOpsConfig);
    await azureDevOpsSubscriptionProvider.signIn();
  }

  return azureDevOpsSubscriptionProvider;
};

export const resetAzureSubscriptionProviderForTests = () => {
  vscodeAzureSubscriptionProvider = undefined;
  azureDevOpsSubscriptionProvider = undefined;
};
