import { AzureDevOpsSubscriptionProvider, VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAzureSubscriptionProvider,
  createVSCodeAzureSubscriptionProvider,
  getAzureDevOpsFederatedCredentialConfig,
  resetAzureSubscriptionProviderForTests,
} from '../VSCodeAzureSubscriptionProvider';

const mocks = vi.hoisted(() => ({
  azureDevOpsConstructor: vi.fn(),
  azureDevOpsSignIn: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-azureauth', () => {
  class MockVSCodeAzureSubscriptionProvider {}

  class MockAzureDevOpsSubscriptionProvider {
    public constructor(initializer: unknown) {
      mocks.azureDevOpsConstructor(initializer);
    }

    public signIn = mocks.azureDevOpsSignIn;
  }

  return {
    AzureDevOpsSubscriptionProvider: MockAzureDevOpsSubscriptionProvider,
    VSCodeAzureSubscriptionProvider: MockVSCodeAzureSubscriptionProvider,
  };
});

const federatedEnvKeys = [
  'FC_SERVICE_CONNECTION_NAME',
  'FC_SERVICE_CONNECTION_ID',
  'FC_SERVICE_CONNECTION_TENANT_ID',
  'FC_SERVICE_CONNECTION_CLIENT_ID',
  'AzCode_UseAzureFederatedCredentials',
  'AzCode_ServiceConnectionID',
  'AzCode_ServiceConnectionDomain',
  'AzCode_ServiceConnectionClientID',
];

describe('createAzureSubscriptionProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetAzureSubscriptionProviderForTests();
    mocks.azureDevOpsSignIn.mockResolvedValue(true);

    for (const key of federatedEnvKeys) {
      delete process.env[key];
    }
  });

  it('returns a VS Code provider by default', async () => {
    const instance = await createAzureSubscriptionProvider();

    expect(instance).toBeInstanceOf(VSCodeAzureSubscriptionProvider);
    expect(mocks.azureDevOpsConstructor).not.toHaveBeenCalled();
  });

  it('keeps the VS Code provider singleton behavior', () => {
    const instance1 = createVSCodeAzureSubscriptionProvider();
    const instance2 = createVSCodeAzureSubscriptionProvider();

    expect(instance1).toBe(instance2);
  });

  it('selects Azure DevOps federated credentials when the full FC env contract is present', async () => {
    process.env.FC_SERVICE_CONNECTION_NAME = 'logicapps-e2e';
    process.env.FC_SERVICE_CONNECTION_ID = 'service-connection-id';
    process.env.FC_SERVICE_CONNECTION_TENANT_ID = 'tenant-id';
    process.env.FC_SERVICE_CONNECTION_CLIENT_ID = 'client-id';

    const instance = await createAzureSubscriptionProvider();

    expect(instance).toBeInstanceOf(AzureDevOpsSubscriptionProvider);
    expect(mocks.azureDevOpsConstructor).toHaveBeenCalledWith({
      serviceConnectionId: 'service-connection-id',
      domain: 'tenant-id',
      clientId: 'client-id',
    });
    expect(mocks.azureDevOpsSignIn).toHaveBeenCalledTimes(1);
  });

  it('supports the legacy AzCode aliases used by AzureTools examples', () => {
    process.env.AzCode_UseAzureFederatedCredentials = 'true';
    process.env.AzCode_ServiceConnectionID = 'legacy-service-connection-id';
    process.env.AzCode_ServiceConnectionDomain = 'legacy-tenant-id';
    process.env.AzCode_ServiceConnectionClientID = 'legacy-client-id';

    expect(getAzureDevOpsFederatedCredentialConfig()).toEqual({
      serviceConnectionId: 'legacy-service-connection-id',
      domain: 'legacy-tenant-id',
      clientId: 'legacy-client-id',
    });
  });

  it('throws when federated credential usage is signaled but required values are missing', () => {
    process.env.FC_SERVICE_CONNECTION_NAME = 'logicapps-e2e';
    process.env.FC_SERVICE_CONNECTION_ID = 'service-connection-id';

    expect(() => getAzureDevOpsFederatedCredentialConfig()).toThrow('federated service connection is not fully configured');
  });
});
