import {
  getOpenAIConnectionParameters,
  getCosmosDbConnectionParameters,
  createOrUpdateConnection,
  getConnectionParametersForEdit,
} from '../connection';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateConnection = vi.fn();
const mockSetQueryData = vi.fn();

vi.mock('@microsoft/logic-apps-shared', () => ({
  ConnectionService: vi.fn(() => ({
    createConnection: mockCreateConnection,
  })),
  getIntl: vi.fn(() => ({
    formatMessage: vi.fn(({ defaultMessage }, values) => {
      if (!values) {
        return defaultMessage;
      }

      return defaultMessage.replace(/\{([^}]+)\}/g, (_, key) => values[key] ?? `{${key}}`);
    }),
  })),
  getPropertyValue: vi.fn((obj, key) => obj?.[key]),
  getObjectPropertyValue: vi.fn((obj, path) => path.reduce((acc: any, currentKey: string) => acc?.[currentKey], obj)),
  ConnectionType: {
    KnowledgeHub: 'KnowledgeHub',
  },
}));

vi.mock('../../../ReactQueryProvider', () => ({
  getReactQueryClient: vi.fn(() => ({
    setQueryData: mockSetQueryData,
  })),
}));

const intl = {
  formatMessage: ({ defaultMessage }: any) => defaultMessage,
} as any;

describe('knowledge connection utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOpenAIConnectionParameters', () => {
    it('returns OpenAI connection parameter sets for key and managed identity auth', () => {
      const result = getOpenAIConnectionParameters(intl);

      expect(result.values).toHaveLength(2);
      expect(result.values[0].name).toBe('Key');
      expect(result.values[1].name).toBe('ManagedServiceIdentity');
    });

    it('includes openAIKey parameter in Key authentication', () => {
      const result = getOpenAIConnectionParameters(intl);

      expect(result.values[0].parameters).toHaveProperty('openAIKey');
      expect(result.values[0].parameters).toHaveProperty('cognitiveServiceAccountId');
      expect(result.values[0].parameters).toHaveProperty('openAIEndpoint');
      expect(result.values[0].parameters).toHaveProperty('openAICompletionsModel');
      expect(result.values[0].parameters).toHaveProperty('openAIEmbeddingsModel');
    });

    it('excludes openAIKey parameter from ManagedServiceIdentity authentication', () => {
      const result = getOpenAIConnectionParameters(intl);

      expect(result.values[1].parameters).not.toHaveProperty('openAIKey');
      expect(result.values[1].parameters).toHaveProperty('cognitiveServiceAccountId');
      expect(result.values[1].parameters).toHaveProperty('openAIEndpoint');
      expect(result.values[1].parameters).toHaveProperty('openAICompletionsModel');
      expect(result.values[1].parameters).toHaveProperty('openAIEmbeddingsModel');
    });

    it('has proper uiDefinition for authentication type', () => {
      const result = getOpenAIConnectionParameters(intl);

      expect(result.uiDefinition).toBeDefined();
      expect(result.uiDefinition?.displayName).toBe('Authentication type');
      expect(result.uiDefinition?.description).toBe('Type of authentication to use');
    });

    it('has proper uiDefinitions for parameter set values', () => {
      const result = getOpenAIConnectionParameters(intl);

      expect(result.values[0].uiDefinition?.displayName).toBe('URL and key-based authentication');
      expect(result.values[1].uiDefinition?.displayName).toBe('Managed Service Identity');
    });
  });

  describe('getCosmosDbConnectionParameters', () => {
    it('returns Cosmos DB connection parameter sets for key and managed identity auth', () => {
      const result = getCosmosDbConnectionParameters(intl);

      expect(result.values).toHaveLength(2);
      expect(result.values[0].name).toBe('Key');
      expect(result.values[1].name).toBe('ManagedServiceIdentity');
    });

    it('includes cosmosDBKey parameter in Key authentication', () => {
      const result = getCosmosDbConnectionParameters(intl);

      expect(result.values[0].parameters).toHaveProperty('cosmosDBKey');
      expect(result.values[0].parameters).toHaveProperty('cosmosDbServiceAccountId');
      expect(result.values[0].parameters).toHaveProperty('cosmosDBEndpoint');
    });

    it('excludes cosmosDBKey parameter from ManagedServiceIdentity authentication', () => {
      const result = getCosmosDbConnectionParameters(intl);

      expect(result.values[1].parameters).not.toHaveProperty('cosmosDBKey');
      expect(result.values[1].parameters).toHaveProperty('cosmosDbServiceAccountId');
      expect(result.values[1].parameters).toHaveProperty('cosmosDBEndpoint');
    });

    it('has proper uiDefinition for authentication type', () => {
      const result = getCosmosDbConnectionParameters(intl);

      expect(result.uiDefinition).toBeDefined();
      expect(result.uiDefinition?.displayName).toBe('Authentication type');
      expect(result.uiDefinition?.description).toBe('Type of authentication to use');
    });

    it('has proper uiDefinitions for parameter set values', () => {
      const result = getCosmosDbConnectionParameters(intl);

      expect(result.values[0].uiDefinition?.displayName).toBe('Key-based');
      expect(result.values[1].uiDefinition?.displayName).toBe('Managed Service Identity');
    });
  });

  describe('createOrUpdateConnection', () => {
    it('creates a knowledge connection with provided parameters', async () => {
      const createdConnection = { id: '/connections/knowledgeHub' };
      mockCreateConnection.mockResolvedValue(createdConnection);

      const parameterValues = {
        displayName: 'Hub connection',
        openAIEndpoint: 'https://openai.endpoint',
        openAIKey: 'secret',
        openAICompletionsModel: 'gpt-4o-mini',
        openAIEmbeddingsModel: 'text-embedding-3-small',
        cognitiveServiceAccountId: '/subscriptions/1/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/openai',
        cosmosDBEndpoint: 'https://cosmos.documents.azure.com',
        cosmosDBKey: 'cosmos-secret',
        cosmosDbServiceAccountId: '/subscriptions/1/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/db',
      };

      const result = await createOrUpdateConnection(parameterValues);

      expect(result).toEqual(createdConnection);
      expect(mockCreateConnection).toHaveBeenCalledTimes(1);
    });

    it('calls ConnectionService.createConnection with correct arguments', async () => {
      const createdConnection = { id: '/connections/knowledgeHub' };
      mockCreateConnection.mockResolvedValue(createdConnection);

      const parameterValues = {
        displayName: 'My Connection',
        openAIEndpoint: 'https://api.openai.com',
      };

      await createOrUpdateConnection(parameterValues);

      const [name, connector, connectionInfo, options] = mockCreateConnection.mock.calls[0];
      expect(name).toBe('HubConnection');
      expect(connector).toEqual({ id: '/dummy/knowledgehub' });
      expect(connectionInfo.displayName).toBe('My Connection');
      expect(connectionInfo.connectionParameters).toBe(parameterValues);
      expect(options.connectionMetadata).toEqual({ required: true, type: 'KnowledgeHub' });
    });

    it('updates query cache after successful connection creation', async () => {
      const createdConnection = { id: '/connections/knowledgeHub' };
      mockCreateConnection.mockResolvedValue(createdConnection);

      await createOrUpdateConnection({ displayName: 'Test' });

      expect(mockSetQueryData).toHaveBeenCalledTimes(1);
      expect(mockSetQueryData).toHaveBeenCalledWith(['knowledgeconnection'], expect.any(Function));

      const updater = mockSetQueryData.mock.calls[0][1];
      expect(updater()).toEqual(createdConnection);
    });

    it('throws formatted error when connection creation fails with nested error', async () => {
      mockCreateConnection.mockRejectedValue({ error: { message: 'service unavailable' } });

      await expect(createOrUpdateConnection({ displayName: 'Hub connection' })).rejects.toThrow(
        'Failed to create connection: service unavailable'
      );
    });

    it('throws formatted error when connection creation fails with top-level message', async () => {
      mockCreateConnection.mockRejectedValue({ message: 'network error' });

      await expect(createOrUpdateConnection({ displayName: 'Hub connection' })).rejects.toThrow(
        'Failed to create connection: network error'
      );
    });

    it('throws error with placeholder when no error message available', async () => {
      mockCreateConnection.mockRejectedValue({});

      await expect(createOrUpdateConnection({ displayName: 'Hub connection' })).rejects.toThrow(
        'Failed to create connection: {errorMessage}'
      );
    });
  });

  describe('getConnectionParametersForEdit', () => {
    it('returns empty parameter values when connection is undefined', () => {
      const result = getConnectionParametersForEdit(intl, undefined);

      expect(result.parameterValues).toBeDefined();
      expect(result.connectionParameters).toBeDefined();
    });

    it('returns empty parameter values when connection is null', () => {
      const result = getConnectionParametersForEdit(intl, null);

      expect(result.parameterValues).toBeDefined();
      expect(result.connectionParameters).toBeDefined();
    });

    it('extracts displayName from connection properties', () => {
      const connection = {
        properties: {
          displayName: 'My Knowledge Hub',
          connectionParameters: {},
        },
      } as any;

      const result = getConnectionParametersForEdit(intl, connection);

      expect(result.parameterValues.displayName).toBe('My Knowledge Hub');
    });

    it('returns connection parameters excluding non-serializable ones', () => {
      const result = getConnectionParametersForEdit(intl, undefined);

      // cosmosDbServiceAccountId and cognitiveServiceAccountId have serialize: false
      expect(result.connectionParameters).not.toHaveProperty('cosmosDbServiceAccountId');
      expect(result.connectionParameters).not.toHaveProperty('cognitiveServiceAccountId');

      // These should be present as they are serializable
      expect(result.connectionParameters).toHaveProperty('cosmosDBEndpoint');
      expect(result.connectionParameters).toHaveProperty('cosmosDBKey');
      expect(result.connectionParameters).toHaveProperty('openAIEndpoint');
      expect(result.connectionParameters).toHaveProperty('openAIKey');
    });

    it('extracts parameter values from connection metadata using serialization path', () => {
      const connection = {
        properties: {
          displayName: 'Test Hub',
          connectionParameters: {
            data: {
              metadata: {
                value: {
                  cosmosDB: {
                    endpoint: 'https://cosmos.test.com',
                    authentication: {
                      type: 'Key',
                      key: 'cosmos-secret-key',
                    },
                  },
                  openAI: {
                    endpoint: 'https://openai.test.com',
                    authentication: {
                      type: 'ManagedServiceIdentity',
                      key: 'openai-secret-key',
                    },
                  },
                  completionsOpenAI: {
                    completionsModel: 'gpt-4',
                  },
                  embeddingsOpenAI: {
                    embeddingsModel: 'text-embedding-ada-002',
                  },
                },
              },
            },
          },
        },
      } as any;

      const result = getConnectionParametersForEdit(intl, connection);

      expect(result.parameterValues.cosmosDBEndpoint).toBe('https://cosmos.test.com');
      expect(result.parameterValues.cosmosDBKey).toBe('cosmos-secret-key');
      expect(result.parameterValues.cosmosDBAuthenticationType).toBe('Key');
      expect(result.parameterValues.openAIEndpoint).toBe('https://openai.test.com');
      expect(result.parameterValues.openAIKey).toBe('openai-secret-key');
      expect(result.parameterValues.openAIAuthenticationType).toBe('ManagedServiceIdentity');
      expect(result.parameterValues.openAICompletionsModel).toBe('gpt-4');
      expect(result.parameterValues.openAIEmbeddingsModel).toBe('text-embedding-ada-002');
    });
  });
});
