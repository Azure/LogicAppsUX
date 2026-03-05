import { getOpenAIConnectionParameters, getCosmosDbConnectionParameters, createConnection } from '../connection';
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
  getObjectPropertyValue: vi.fn((obj, path) => path.reduce((acc, currentKey) => acc?.[currentKey], obj)),
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

  it('returns OpenAI connection parameter sets for key and managed identity auth', () => {
    const result = getOpenAIConnectionParameters(intl);

    expect(result.values).toHaveLength(2);
    expect(result.values[0].name).toBe('Key');
    expect(result.values[1].name).toBe('ManagedServiceIdentity');
    expect(result.values[0].parameters).toHaveProperty('openAIAuthenticationKey');
    expect(result.values[1].parameters).not.toHaveProperty('openAIAuthenticationKey');
  });

  it('returns Cosmos DB connection parameter sets for key and managed identity auth', () => {
    const result = getCosmosDbConnectionParameters(intl);

    expect(result.values).toHaveLength(2);
    expect(result.values[0].name).toBe('Key');
    expect(result.values[1].name).toBe('ManagedServiceIdentity');
    expect(result.values[0].parameters).toHaveProperty('cosmosDBAuthenticationKey');
    expect(result.values[1].parameters).not.toHaveProperty('cosmosDBAuthenticationKey');
  });

  it('creates a knowledge connection and updates cache', async () => {
    const createdConnection = { id: '/connections/knowledgeHub' };
    mockCreateConnection.mockResolvedValue(createdConnection);

    const openAIParameterValues = {
      openAIEndpoint: 'https://openai.endpoint',
      openAIAuthenticationKey: 'secret',
      openAICompletionsModel: 'gpt-4o-mini',
      openAIEmbeddingsModel: 'text-embedding-3-small',
      cognitiveServiceAccountId: '/subscriptions/1/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/openai',
    };

    const cosmosDbParameterValues = {
      cosmosDBEndpoint: 'https://cosmos.documents.azure.com',
      cosmosDBAuthenticationKey: 'cosmos-secret',
      cosmosDbServiceAccountId: '/subscriptions/1/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/db',
    };

    const result = await createConnection({
      displayName: 'Hub connection',
      openAI: {
        authenticationType: 'Key',
        parameterValues: openAIParameterValues,
      },
      cosmosDB: {
        authenticationType: 'ManagedServiceIdentity',
        parameterValues: cosmosDbParameterValues,
      },
    });

    expect(result).toEqual(createdConnection);
    expect(mockCreateConnection).toHaveBeenCalledTimes(1);

    const [name, connector, connectionInfo, options] = mockCreateConnection.mock.calls[0];
    expect(name).toBe('HubConnection');
    expect(connector).toEqual({ id: '/dummy/knowledgehub' });
    expect(connectionInfo.displayName).toBe('Hub connection');
    expect(connectionInfo.connectionParameters).toMatchObject({
      ...openAIParameterValues,
      ...cosmosDbParameterValues,
      openAIAuthenticationType: 'Key',
      cosmosDBAuthenticationType: 'ManagedServiceIdentity',
    });

    expect(options.connectionMetadata).toEqual({ required: true, type: 'KnowledgeHub' });
    expect(options.connectionParameters).not.toHaveProperty('cognitiveServiceAccountId');
    expect(options.connectionParameters).not.toHaveProperty('cosmosDbServiceAccountId');
    expect(options.connectionParameters).toHaveProperty('openAIEndpoint');
    expect(options.connectionParameters).toHaveProperty('cosmosDBEndpoint');

    expect(mockSetQueryData).toHaveBeenCalledTimes(1);
    expect(mockSetQueryData).toHaveBeenCalledWith(['knowledgeconnection'], expect.any(Function));

    const updater = mockSetQueryData.mock.calls[0][1];
    expect(updater()).toEqual(createdConnection);
  });

  it('throws formatted error when connection creation fails', async () => {
    mockCreateConnection.mockRejectedValue({ error: { message: 'service unavailable' } });

    await expect(
      createConnection({
        displayName: 'Hub connection',
        openAI: {
          authenticationType: 'Key',
          parameterValues: {},
        },
        cosmosDB: {
          authenticationType: 'Key',
          parameterValues: {},
        },
      })
    ).rejects.toThrow('Failed to create connection: service unavailable');
  });
});
