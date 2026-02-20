import type { ConnectionParameterSets, ConnectionParameter, ConnectionParameterSetParameter, Connector } from "@microsoft/logic-apps-shared";
import { ConnectionService, getIntl, getPropertyValue, ConnectionType, getObjectPropertyValue } from "@microsoft/logic-apps-shared";
import type { IntlShape } from "react-intl";
import { getReactQueryClient } from "../../ReactQueryProvider";

const getAllConnectionParameters = (intl: IntlShape) => {
    return {
        cognitiveServiceAccountId: {
            type: 'string',
            uiDefinition: {
                displayName: 'Azure Cognitive Service Account',
                description: 'Select the Azure Cognitive Service Account to use for this connection',
                tooltip: 'Select the Azure Cognitive Service Account to use for this connection',
                constraints: {
                    clearText: true,
                    required: 'true',
                    serialize: false
                },
            },
        } as ConnectionParameter,
        openAICompletionsModel: {
            type: 'string',
            uiDefinition: {
                displayName: intl.formatMessage({
                    id: 'E7PMTh',
                    defaultMessage: 'Completions model',
                    description: 'Label for completions model connection parameter',
                }),
                description: intl.formatMessage({
                    id: 'ChIvwj',
                    defaultMessage: 'Select the completions model to use for this connection',
                    description: 'Description for completions model connection parameter',
                }),
                tooltip: intl.formatMessage({
                    id: 'die3ro',
                    defaultMessage: 'Select the completions model to use for this connection',
                    description: 'Tooltip for completions model connection parameter',
                }),
                constraints: {
                    clearText: true,
                    required: 'true',
                    propertyPath: ['openAI', 'completionsModel']
                },
            },
        } as ConnectionParameter,
        openAIEmbeddingsModel: {
            type: 'string',
            uiDefinition: {
                displayName: intl.formatMessage({
                    id: 'nsr+K2',
                    defaultMessage: 'Embeddings model',
                    description: 'Label for embeddings model connection parameter',
                }),
                description: intl.formatMessage({
                    id: 'bAzuvE',
                    defaultMessage: 'Select the embeddings model to use for this connection',
                    description: 'Description for embeddings model connection parameter',
                }),
                tooltip: intl.formatMessage({
                    id: 'BQY4w7',
                    defaultMessage: 'Select the embeddings model to use for this connection',
                    description: 'Tooltip for embeddings model connection parameter',
                }),
                constraints: {
                    clearText: true,
                    required: 'true',
                    propertyPath: ['openAI', 'embeddingsModel']
                },
            },
        } as ConnectionParameter,
        openAIAuthenticationKey: {
            type: 'securestring',
            parameterSource: 'AppConfiguration',
            uiDefinition: {
                displayName: intl.formatMessage({
                    id: 'ZNPMjo',
                    defaultMessage: 'API key',
                    description: 'Label for API key connection parameter',
                }),
                description: intl.formatMessage({
                    id: 'fRWxou',
                    defaultMessage: 'Key will be filled automatically.',
                    description: 'Description for API key connection parameter',
                }),
                tooltip: intl.formatMessage({
                    id: 'tTSsMz',
                    defaultMessage: 'The API key to access the resource that hosts the AI model',
                    description: 'Tooltip for API key connection parameter',
                }),
                constraints: {
                    clearText: false,
                    required: 'true',
                    propertyPath: ['openAI', 'authentication', 'key']
                },
            },
        } as ConnectionParameter,
        openAIEndpoint: {
            type: 'string',
            uiDefinition: {
                displayName: intl.formatMessage({
                    id: 'tWAk7P',
                    defaultMessage: 'API endpoint',
                    description: 'Label for API endpoint connection parameter',
                }),
                description: intl.formatMessage({
                    id: '+K0G5q',
                    defaultMessage: 'Endpoint will be filled automatically.',
                    description: 'Description for API endpoint connection parameter',
                }),
                tooltip: intl.formatMessage({
                    id: 'GfHVO/',
                    defaultMessage: 'The endpoint of the resource that hosts the AI model',
                    description: 'Tooltip for API endpoint connection parameter',
                }),
                constraints: {
                    clearText: true,
                    required: 'true',
                    propertyPath: ['openAI', 'endpoint']
                },
            },
        } as ConnectionParameter,
        openAIDBAuthenticationType: {
            type: 'string',
            uiDefinition: {
                displayName: 'Authentication type',
                description: 'Authentication type',
                constraints: {
                    clearText: true,
                    required: 'true',
                    propertyPath: ['openAI', 'authentication', 'type']
                },
            },
        },
        cosmosDbServiceAccountId: {
            type: 'string',
            uiDefinition: {
                displayName: 'Azure Cosmos DB Service Account',
                description: 'Select the Azure Cosmos DB Service Account to use for this connection',
                tooltip: 'Select the Azure Cosmos DB Service Account to use for this connection',
                constraints: {
                    clearText: true,
                    required: 'true',
                    serialize: false
                },
            },
        } as ConnectionParameter,
        cosmosDBAuthenticationKey: {
            type: 'securestring',
            parameterSource: 'AppConfiguration',
            uiDefinition: {
                displayName: intl.formatMessage({
                    id: 'G8AUbT',
                    defaultMessage: 'Key',
                    description: 'Label for key connection parameter',
                }),
                description: intl.formatMessage({
                    id: 'L84XBq',
                    defaultMessage: 'Key will be filled automatically.',
                    description: 'Description for key connection parameter',
                }),
                tooltip: intl.formatMessage({
                    id: 'sP4DTE',
                    defaultMessage: 'The key to access the resource that hosts the AI model',
                    description: 'Tooltip for key connection parameter',
                }),
                constraints: {
                    clearText: false,
                    required: 'true',
                    propertyPath: ['cosmosDB', 'authentication', 'key']
                },
            },
        } as ConnectionParameter,
        cosmosDBEndpoint: {
            type: 'string',
            uiDefinition: {
                displayName: intl.formatMessage({
                    id: 'lx2rJW',
                    defaultMessage: 'URL endpoint',
                    description: 'Label for URL endpoint connection parameter',
                }),
                description: intl.formatMessage({
                    id: 'QBAwgb',
                    defaultMessage: 'Endpoint will be filled automatically.',
                    description: 'Description for URL endpoint connection parameter',
                }),
                tooltip: intl.formatMessage({
                    id: 'leA1MT',
                    defaultMessage: 'The endpoint of the Cosmos DB account',
                    description: 'Tooltip for URL endpoint connection parameter',
                }),
                constraints: {
                    clearText: true,
                    required: 'true',
                    propertyPath: ['cosmosDB', 'endpoint']
                },
            },
        } as ConnectionParameter,
        cosmosDBAuthenticationType: {
            type: 'string',
            uiDefinition: {
                displayName: 'Authentication type',
                description: 'Authentication type',
                constraints: {
                    clearText: true,
                    required: 'true',
                    propertyPath: ['cosmosDB', 'authentication', 'type']
                },
            },
        }
    }
};

export const getOpenAIConnectionParameters = (intl: IntlShape): ConnectionParameterSets => {
    const allParameters = getAllConnectionParameters(intl);
    return {
      uiDefinition: {
        displayName: intl.formatMessage({
            id: 'IGxGlO',
            defaultMessage: 'Authentication type',
            description: 'Label for authentication type connection parameter',
        }),
        description: intl.formatMessage({
            id: 'rQxmJR',
            defaultMessage: 'Type of authentication to use',
            description: 'Description for authentication type connection parameter',
        }),
      },
      values: [
        {
            name: 'Key',
            parameters: {
                cognitiveServiceAccountId: allParameters.cognitiveServiceAccountId as ConnectionParameterSetParameter,
                openAIEndpoint: allParameters.openAIEndpoint as ConnectionParameterSetParameter,
                openAIAuthenticationKey: allParameters.openAIAuthenticationKey as ConnectionParameterSetParameter,
                openAICompletionsModel: allParameters.openAICompletionsModel as ConnectionParameterSetParameter,
                openAIEmbeddingsModel: allParameters.openAIEmbeddingsModel as ConnectionParameterSetParameter
            },
            uiDefinition: {
                displayName: intl.formatMessage({
                    id: 'GdaJgz',
                    defaultMessage: 'URL and key-based authentication',
                    description: 'Display name for URL and key-based authentication',
                }),
                tooltip: intl.formatMessage({
                    id: 'E+cyaO',
                    defaultMessage: 'URL and key-based authentication',
                    description: 'Tooltip for URL and key-based authentication',
                }),
                description: intl.formatMessage({
                    id: 'GD79s3',
                    defaultMessage: 'URL and key-based authentication',
                    description: 'Description for URL and key-based authentication',
                }),
            },
        },
        {
            name: 'ManagedServiceIdentity',
            parameters: {
                cognitiveServiceAccountId: allParameters.cognitiveServiceAccountId as ConnectionParameterSetParameter,
                openAIEndpoint: allParameters.openAIEndpoint as ConnectionParameterSetParameter,
                openAICompletionsModel: allParameters.openAICompletionsModel as ConnectionParameterSetParameter,
                openAIEmbeddingsModel: allParameters.openAIEmbeddingsModel as ConnectionParameterSetParameter
            },
            uiDefinition: {
                displayName: intl.formatMessage({
                    id: '0147jq',
                    defaultMessage: 'Managed Service Identity',
                    description: 'Display name for Managed Service Identity authentication',
                }),
                tooltip: intl.formatMessage({
                    id: 'iQK/gD',
                    defaultMessage: 'Managed Service Identity',
                    description: 'Tooltip for Managed Service Identity authentication',
                }),
                description: intl.formatMessage({
                    id: '6TZBof',
                    defaultMessage: 'Managed Service Identity',
                    description: 'Description for Managed Service Identity authentication',
                }),
            },
        }
      ]
    };
}

export const getCosmosDbConnectionParameters = (intl: IntlShape): ConnectionParameterSets => {
    const allParameters = getAllConnectionParameters(intl);
    return {
      uiDefinition: {
        displayName: intl.formatMessage({
            id: 'IGxGlO',
            defaultMessage: 'Authentication type',
            description: 'Label for authentication type connection parameter',
        }),
        description: intl.formatMessage({
            id: 'rQxmJR',
            defaultMessage: 'Type of authentication to use',
            description: 'Description for authentication type connection parameter',
        }),
      },
      values: [
        {
            name: 'Key',
            parameters: {
                cosmosDbServiceAccountId: allParameters.cosmosDbServiceAccountId as ConnectionParameterSetParameter,
                cosmosDBEndpoint: allParameters.cosmosDBEndpoint as ConnectionParameterSetParameter,
                cosmosDBAuthenticationKey: allParameters.cosmosDBAuthenticationKey as ConnectionParameterSetParameter,
            },
            uiDefinition: {
                displayName: intl.formatMessage({
                    id: 'dDCpCR',
                    defaultMessage: 'Key-based',
                    description: 'Display name for key-based authentication',
                }),
                tooltip: intl.formatMessage({
                    id: 'o2Qop6',
                    defaultMessage: 'Key-based authentication',
                    description: 'Tooltip for key-based authentication',
                }),
                description: intl.formatMessage({
                    id: '80z7j2',
                    defaultMessage: 'Key-based authentication',
                    description: 'Description for key-based authentication',
                }),
            },
        },
        {
            name: 'ManagedServiceIdentity',
            parameters: {
                cosmosDbServiceAccountId: allParameters.cosmosDbServiceAccountId as ConnectionParameterSetParameter,
                cosmosDBEndpoint: allParameters.cosmosDBEndpoint as ConnectionParameterSetParameter,
            },
            uiDefinition: {
                displayName: intl.formatMessage({
                    id: '0147jq',
                    defaultMessage: 'Managed Service Identity',
                    description: 'Display name for Managed Service Identity authentication',
                }),
                tooltip: intl.formatMessage({
                    id: 'iQK/gD',
                    defaultMessage: 'Managed Service Identity',
                    description: 'Tooltip for Managed Service Identity authentication',
                }),
                description: intl.formatMessage({
                    id: '6TZBof',
                    defaultMessage: 'Managed Service Identity',
                    description: 'Description for Managed Service Identity authentication',
                }),
            },
        }
      ]
    };
}

export const createConnection = async ({ displayName, openAI, cosmosDB }: {
    displayName: string;
    openAI: {
        authenticationType: string;
        parameterValues: Record<string, any>;
    };
    cosmosDB: {
        authenticationType: string;
        parameterValues: Record<string, any>;
    };
}) => {
    const intl = getIntl();
    const allParams = getAllConnectionParameters(intl);
    const connectionParameters = Object.keys(allParams).reduce((result: Record<string, ConnectionParameter>, key: string) => {
        const parameter = getPropertyValue(allParams, key);
        if (getPropertyValue(allParams, key).uiDefinition?.constraints?.serialize !== false) {
            result[key] = parameter;
        }

        return result;
    }, {} as Record<string, ConnectionParameter>);
    const allParameterValues = {
        ...openAI.parameterValues,
        ...cosmosDB.parameterValues,
        openAIAuthenticationType: openAI.authenticationType,
        cosmosDBAuthenticationType: cosmosDB.authenticationType
    }

    try {
        const connection = await ConnectionService().createConnection(
            'HubConnection',
            { id: '/dummy/knowledgehub' } as unknown as Connector,
            { displayName, connectionParameters: allParameterValues },
            { connectionParameters, connectionMetadata: { required: true, type: ConnectionType.KnowledgeHub } }
        );

        // Add the new connection to the query cache.
        getReactQueryClient().setQueryData(['knowledgehubconnection'], () => connection);

        return connection;
    } catch (error: any) {
        const errorMessage = getObjectPropertyValue(error, ['error', 'message']) ?? getObjectPropertyValue(error, ['message']);
        throw new Error(intl.formatMessage({
            id: 'y8JeCD',
            defaultMessage: 'Failed to create connection: {errorMessage}',
            description: 'Error message when connection creation fails',
        }, { errorMessage }));
    }
};
