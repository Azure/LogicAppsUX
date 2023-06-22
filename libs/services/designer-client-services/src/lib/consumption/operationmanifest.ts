import { BaseOperationManifestService } from '../base';
import type { BaseOperationManifestServiceOptions } from '../base/operationmanifest';
import {
  getBuiltInOperationInfo,
  isBuiltInOperation,
  supportedBaseManifestObjects,
  supportedBaseManifestTypes,
} from '../base/operationmanifest';
import { apiManagementActionManifest, apiManagementTriggerManifest } from './manifests/apiManagement';
import { appServiceActionManifest, appServiceTriggerManifest } from './manifests/appServices';
import { batchTriggerManifest, sendToBatchManifest } from './manifests/batchWorkflow';
import { composeManifest } from './manifests/compose';
import { flatFileDecodingManifest, flatFileEncodingManifest } from './manifests/flatfile';
import { selectFunctionManifest } from './manifests/functions';
import { inlineCodeManifest } from './manifests/inlinecode';
import { integrationAccountArtifactLookupManifest } from './manifests/integrationaccountartifactlookup';
import { invokeWorkflowManifest } from './manifests/invokeWorkflow';
import { liquidJsonToJsonManifest, liquidJsonToTextManifest, liquidXmlToJsonManifest, liquidXmlToTextManifest } from './manifests/liquid';
import { selectSwaggerFunctionManifest } from './manifests/swaggerFunctions';
import { xmlTransformManifest, xmlValidationManifest } from './manifests/xml';
import { functionGroup, functionOperation, invokeWorkflowGroup, invokeWorkflowOperation, swaggerFunctionOperation } from './operations';
import type { OperationInfo, OperationManifest } from '@microsoft/utils-logic-apps';
import { ArgumentException, UnsupportedException, endsWith, startsWith } from '@microsoft/utils-logic-apps';

interface ConsumptionOperationManifestServiceOptions extends BaseOperationManifestServiceOptions {
  subscriptionId: string;
  location: string;
}

export class ConsumptionOperationManifestService extends BaseOperationManifestService {
  constructor(override readonly options: ConsumptionOperationManifestServiceOptions) {
    super(options);
    const { subscriptionId, location } = options;
    if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required');
    } else if (!location) {
      throw new ArgumentException('location required');
    }
  }

  override async getOperationInfo(definition: any, isTrigger: boolean): Promise<OperationInfo> {
    if (isBuiltInOperation(definition)) {
      const normalizedOperationType = definition.type?.toLowerCase();

      switch (normalizedOperationType) {
        case 'workflow':
          return {
            connectorId: invokeWorkflowGroup.id,
            operationId: invokeWorkflowOperation.id,
          };

        case 'function':
          return {
            connectorId: functionGroup.id,
            operationId: definition?.inputs?.uri ? swaggerFunctionOperation.id : functionOperation.id,
          };

        default:
          return getBuiltInOperationInfo(definition, isTrigger);
      }
    } else if (startsWith(definition.type, openapiconnection)) {
      const { subscriptionId, location } = this.options;
      return {
        connectorId: `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}${definition.inputs.host.apiId}`,
        operationId: definition.inputs.host.operationId,
      };
    }

    throw new UnsupportedException(`Operation type: ${definition.type} does not support manifest.`);
  }

  override isSupported(operationType: string, _operationKind?: string): boolean {
    const { supportedTypes } = this.options;
    const normalizedOperationType = operationType.toLowerCase();
    return supportedTypes
      ? supportedTypes.indexOf(normalizedOperationType) > -1
      : supportedConsumptionManifestTypes.indexOf(normalizedOperationType) > -1;
  }

  override async getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest> {
    const supportedManifest = supportedConsumptionManifestObjects.get(operationId);

    if (supportedManifest) {
      return supportedManifest;
    }

    const { apiVersion, baseUrl, httpClient } = this.options;
    const operationName = operationId.split('/').slice(-1)[0];
    const queryParameters = {
      'api-version': apiVersion,
      $expand: 'properties/manifest',
    };

    try {
      const response = !endsWith(operationId, 'sendmessage')
        ? await httpClient.get<any>({
            uri: `${baseUrl}${connectorId}/apiOperations/${operationName}`,
            queryParameters,
          })
        : sendMessageManifest;

      const {
        properties: { brandColor, description, iconUri, manifest, api, operationType },
      } = response;

      const operationManifest = {
        properties: {
          brandColor: brandColor ?? api?.brandColor,
          description,
          iconUri: iconUri ?? api?.iconUri,
          connection: startsWith(operationType, openapiconnection) ? { required: true } : undefined,
          ...manifest,
        },
      };

      return operationManifest;
    } catch (error) {
      return { properties: {} } as any;
    }
  }
}

const openapiconnection = 'openapiconnection';
const composenew = 'composenew';
const integrationaccountartifactlookup = 'integrationaccountartifactlookup';
const liquidjsontojson = 'liquidjsontojson';
const liquidjsontotext = 'liquidjsontotext';
const liquidxmltojson = 'liquidxmltojson';
const liquidxmltotext = 'liquidxmltotext';
const xmltransform = 'xmltransform';
const xmlvalidation = 'xmlvalidation';
const inlinecode = 'javascriptcode';
const flatfiledecoding = 'flatfiledecoding';
const flatfileencoding = 'flatfileencoding';

// Azure Resource Connectors
const apimanagement = 'apimanagement';
const apimanagementtrigger = 'apimanagementtrigger';
const appservice = 'appservice';
const appservicetrigger = 'appservicetrigger';
const invokeworkflow = 'invokeworkflow';
const sendtobatch = 'sendtobatch';
const batch = 'batch';

const supportedConsumptionManifestTypes = [...supportedBaseManifestTypes, appservice, openapiconnection];

const supportedConsumptionManifestObjects = new Map<string, OperationManifest>([
  ...supportedBaseManifestObjects,
  [composenew, composeManifest],
  [integrationaccountartifactlookup, integrationAccountArtifactLookupManifest],
  [liquidjsontojson, liquidJsonToJsonManifest],
  [liquidjsontotext, liquidJsonToTextManifest],
  [liquidxmltojson, liquidXmlToJsonManifest],
  [liquidxmltotext, liquidXmlToTextManifest],
  [xmltransform, xmlTransformManifest],
  [xmlvalidation, xmlValidationManifest],
  [inlinecode, inlineCodeManifest],
  [flatfiledecoding, flatFileDecodingManifest],
  [flatfileencoding, flatFileEncodingManifest],
  [apimanagement, apiManagementActionManifest],
  [apimanagementtrigger, apiManagementTriggerManifest],
  [appservice, appServiceActionManifest],
  [appservicetrigger, appServiceTriggerManifest],
  ['azurefunction', selectFunctionManifest],
  ['azureswaggerfunction', selectSwaggerFunctionManifest],
  [invokeworkflow, invokeWorkflowManifest],
  [sendtobatch, sendToBatchManifest],
  [batch, batchTriggerManifest],
]);

const sbConnector = {
  properties: {
    name: 'servicebus',
    connectionParameters: {
      connectionString: {
        type: 'securestring',
        uiDefinition: {
          displayName: 'Connection String',
          description: 'Azure Service Bus Connection String',
          tooltip: 'Provide Azure Service Bus Connection String',
          constraints: {
            required: 'true',
          },
        },
      },
    },
    connectionParameterSets: {
      uiDefinition: {
        displayName: 'Authentication Type',
        description: 'Type of authentication to be used',
      },
      values: [
        {
          name: 'connectionstringauth',
          uiDefinition: {
            displayName: 'Access Key',
            description: 'Provide connection string to access your Azure Service Bus.',
          },
          parameters: {
            connectionString: {
              type: 'securestring',
              uiDefinition: {
                displayName: 'Connection String',
                description: 'Azure Service Bus Connection String',
                tooltip: 'Provide Azure Service Bus Connection String',
                constraints: {
                  required: 'true',
                },
              },
            },
          },
          metadata: {
            allowSharing: false,
          },
        },
        {
          name: 'aadAuth',
          uiDefinition: {
            displayName: 'Azure AD Integrated',
            description: 'Use Azure Active Directory to access your Azure Service Bus.',
          },
          parameters: {
            token: {
              type: 'oauthSetting',
              oAuthSettings: {
                identityProvider: 'aadcertificate',
                clientId: '9375045e-1161-46c7-be76-4feb94bdcbbb',
                scopes: [],
                redirectMode: 'GlobalPerConnector',
                redirectUrl: 'https://global.consent.azure-apim.net/redirect/servicebus',
                properties: {
                  IsFirstParty: 'True',
                  AzureActiveDirectoryResourceId: 'https://servicebus.azure.net',
                  IsOnbehalfofLoginSupported: true,
                },
                customParameters: {
                  grantType: {
                    value: 'code',
                  },
                  resourceUri: {
                    value: 'https://servicebus.azure.net',
                  },
                  loginUriAAD: {
                    value: 'https://login.windows.net',
                  },
                },
              },
              uiDefinition: {
                displayName: 'Login with your Credentials',
                description: 'Sign in with your Azure Active Directory credentials',
                tooltip: 'Provide Azure Active Directory credentials',
                constraints: {
                  required: 'true',
                  hidden: 'false',
                },
              },
            },
            namespaceEndpoint: {
              type: 'string',
              uiDefinition: {
                displayName: 'Namespace Endpoint',
                description: 'Provide Service Bus Namespace Endpoint (e.g: sb://testsb.servicebus.windows.net/)',
                tooltip: 'Provide Service Bus Namespace Endpoint (e.g: sb://testsb.servicebus.windows.net/)',
                constraints: {
                  required: 'true',
                },
              },
            },
          },
          metadata: {
            allowSharing: false,
          },
        },
        {
          name: 'managedIdentityAuth',
          uiDefinition: {
            displayName: 'Logic Apps Managed Identity',
            description: 'Create a connection using a LogicApps Managed Identity',
          },
          parameters: {
            token: {
              type: 'managedIdentity',
              managedIdentitySettings: {
                resourceUri: 'https://servicebus.azure.net',
              },
              uiDefinition: {
                displayName: 'LogicApps Managed Identity',
                description: 'Sign in with a Logic Apps Managed Identity',
                tooltip: 'Managed Identity',
                constraints: {
                  location: 'logicapp',
                  required: 'true',
                },
              },
            },
            namespaceEndpoint: {
              type: 'string',
              uiDefinition: {
                displayName: 'Namespace Endpoint',
                description: 'Provide Service Bus Namespace Endpoint (e.g: sb://testsb.servicebus.windows.net/)',
                tooltip: 'Provide Service Bus Namespace Endpoint (e.g: sb://testsb.servicebus.windows.net/)',
                constraints: {
                  required: 'true',
                },
              },
            },
          },
          metadata: {
            allowSharing: true,
          },
        },
      ],
    },
    metadata: {
      source: 'marketplace',
      brandColor: '#c4d5ff',
      useNewApimVersion: true,
    },
    runtimeUrls: ['https://logic-apis-westus.azure-apim.net/apim/servicebus'],
    generalInformation: {
      iconUrl: 'https://connectoricons-prod.azureedge.net/u/shgogna/globalperconnector-train2/1.0.1641.3328/servicebus/icon.png',
      displayName: 'Service Bus',
      description:
        'Connect to Azure Service Bus to send and receive messages. You can perform actions such as send to queue, send to topic, receive from queue, receive from subscription, etc.',
      releaseTag: 'Production',
      tier: 'Premium',
    },
    capabilities: ['actions'],
    isExportSupported: true,
  },
  id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/providers/Microsoft.Web/locations/westus/managedApis/servicebus',
  name: 'servicebus',
  type: 'Microsoft.Web/locations/managedApis',
  location: 'westus',
};

const sendMessageManifest = {
  properties: {
    summary: 'Send message',
    description: 'This operation sends a message to a queue or topic.',
    pageable: false,
    isChunkingSupported: false,
    annotation: {
      status: 'Production',
      family: 'MyOperation',
      revision: 1,
    },
    api: {
      name: sbConnector.name,
      displayName: sbConnector.properties.generalInformation.displayName,
      description: sbConnector.properties.generalInformation.description,
      iconUri: sbConnector.properties.generalInformation.iconUrl,
      brandColor: sbConnector.properties.metadata.brandColor,
      category: 'Standard',
      id: sbConnector.id,
      type: sbConnector.type,
    },
    isWebhook: false,
    isNotification: false,
    manifest: {
      inputs: {
        type: 'object',
        properties: {
          message: {
            type: 'object',
            properties: {
              ContentData: {
                format: 'byte',
                description: 'Content of the message',
                type: 'string',
                title: 'Content',
                'x-ms-property-name-alias': 'message/ContentData',
              },
              ContentType: {
                description: 'Content type of the message content',
                type: 'string',
                title: 'Content Type',
                'x-ms-property-name-alias': 'message/ContentType',
              },
              MessageId: {
                description: 'This is a user-defined value that Service Bus can use to identify duplicate messages, if enabled.',
                type: 'string',
                title: 'Message Id',
                'x-ms-visibility': 'advanced',
                'x-ms-property-name-alias': 'message/MessageId',
              },
            },
            required: [],
            'x-ms-property-name-alias': 'message',
          },
          entityName: {
            type: 'string',
            'x-ms-property-name-alias': 'entityName',
            title: 'Queue/Topic name',
            'x-ms-dynamic-list': {
              dynamicState: {
                operationId: 'GetEntities',
                parameters: {},
              },
              itemValuePath: 'Name',
              itemTitlePath: 'DisplayName',
            },
          },
          systemProperties: {
            type: 'string',
            default: 'None',
            'x-ms-property-name-alias': 'systemProperties',
            title: 'System properties',
            description:
              'System properties - None or Run Details. Run Details will add run metadata property details as custom properties in the message.',
            'x-ms-dynamic-list': {
              dynamicState: {
                operationId: 'GetSystemProperties',
                parameters: {},
              },
            },
          },
        },
        required: ['message', 'entityName'],
      },
      inputsLocation: ['inputs', 'parameters'],
      isInputsOptional: false,
      outputs: {
        type: 'object',
        properties: {
          headers: {
            type: 'object',
            properties: {
              myHeader: {
                type: 'string',
                'x-ms-property-name-alias': 'headers/myHeader',
              },
            },
            'x-ms-property-name-alias': 'headers',
          },
          body: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                number: {
                  type: 'number',
                  'x-ms-property-name-alias': 'number',
                },
                alias: {
                  type: 'string',
                  format: 'date-time',
                  'x-ms-property-name-alias': 'alias',
                },
              },
              required: [],
            },
            'x-ms-property-name-alias': 'body',
          },
        },
      },
      isOutputsOptional: false,
      settings: {
        secureData: {},
        trackedProperties: {
          scopes: ['Action'],
        },
        retryPolicy: {
          scopes: ['Action'],
        },
      },
      includeRootOutputs: false,
      connectionReference: {
        referenceKeyFormat: 'openapiconnection',
      },
      connector: sbConnector,
      statusBadge: {
        name: 'Production',
        description: 'Production',
      },
      operationOptions: 'None',
    },
    operationType: 'OpenApiConnection',
    operationKind: 'NotSpecified',
  },
};
