import { BaseOperationManifestService } from '../base';
import { batchConnectorId, getBuiltInOperationInfo, isBuiltInOperation, supportedBaseManifestObjects } from '../base/operationmanifest';
import type { OperationInfo, OperationManifest } from '@microsoft/utils-logic-apps';
import { equals, ConnectionType } from '@microsoft/utils-logic-apps';

export class StandardOperationManifestService extends BaseOperationManifestService {
  override async getOperationInfo(definition: any, isTrigger: boolean): Promise<OperationInfo> {
    if (isBuiltInOperation(definition)) {
      return getBuiltInOperationInfo(definition, isTrigger);
    } else if (isServiceProviderOperation(definition)) {
      return {
        connectorId: definition.inputs.serviceProviderConfiguration.serviceProviderId,
        operationId: definition.inputs.serviceProviderConfiguration.operationId,
      };
    }

    return {
      connectorId: 'Unknown',
      operationId: 'Unknown',
    };

    //throw new UnsupportedException(`Operation type: ${definition.type} does not support manifest.`);
  }

  override async getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest> {
    if (equals(connectorId, 'connectionProviders/request')) {
      return batchTriggerManifest;
    } else if (equals(connectorId, 'connectionProviders/datetime')) {
      return sendBatchManifest;
    }

    const supportedManifest = supportedBaseManifestObjects.get(operationId);

    if (supportedManifest) return supportedManifest;

    const { apiVersion, baseUrl, httpClient } = this.options;
    const connectorName = connectorId.split('/').slice(-1)[0];
    const operationName = operationId.split('/').slice(-1)[0];
    const queryParameters = {
      'api-version': apiVersion,
      $expand: 'properties/manifest',
    };

    try {
      const response = await httpClient.get<any>({
        uri: `${baseUrl}/operationGroups/${connectorName}/operations/${operationName}`,
        queryParameters,
      });

      const {
        properties: { brandColor, description, iconUri, manifest, operationType },
      } = response;

      // TODO: Remove below patching of connection when backend api sends correct information for service providers
      const operationManifest = {
        properties: {
          brandColor,
          description,
          iconUri,
          connection: equals(operationType, 'serviceprovider') ? { required: true, type: ConnectionType.ServiceProvider } : undefined,
          ...manifest,
        },
      };

      return operationManifest;
    } catch (error) {
      return { properties: {} } as any;
    }
  }
}

function isServiceProviderOperation(definition: any): boolean {
  return equals(definition.type, 'ServiceProvider');
}

const batchTriggerManifest = {
  properties: {
    "brandColor": '#2280CC',
    "iconUri": "https://logicappsv2resources.blob.core.windows.net/icons/apimanagement.svg",
    "description": "Batch Trigger",
    "inputs": {
        "type": "object",
        "properties": {
            "mode": {
              "type": "string",
              "default": "Inline",
              "x-ms-visibility": "hideInUI"
            },
            "configurations": {
              "type": "object",
              "properties": {
                "$$batchName$$": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string",
                      "title": "Batch Name",
                      "description": "Name of the batch.",
                      "x-ms-serialization": {
                        "property": {
                          "type": "parentobject",
                          "name": "$$batchName$$",
                          "parameterReference": "configurations.$$batchName$$"
                        }
                      }
                    },
                    "releaseCriteria": {
                      "type": "object",
                      "properties": {
                        "type": {
                          "type": "array",
                          "title": "Release Criteria",
                          "description": "Release criteria of the batch.",
                          'x-ms-editor': 'dropdown',
                          'x-ms-editor-options': {
                            multiSelect: true,
                            serialization: { valueType: 'array' },
                            titleSeparator: ',',
                            options: [
                              { value: 'messageCount', displayName: 'Message count based' },
                              { value: 'batchSize', displayName: 'Size based' },
                              { value: 'recurrence', displayName: 'Schedule based' },
                            ]
                          },
                          "x-ms-serialization": {
                            skip: true
                          },
                          "x-ms-deserialization": {
                            type: 'parentobjectproperties',
                            parameterReference: 'configurations.$$batchName$$.releaseCriteria'
                          }
                        },
                        "messageCount": {
                          "type": "integer",
                          "title": "Message Count",
                          "description": "Number of messages to be batched and released.",
                          "x-ms-visibility": "important",
                          'x-ms-input-dependencies': {
                            type: 'visibility',
                            parameters: [
                              {
                                name: 'configurations.$$batchName$$.releaseCriteria.type',
                                values: ['messageCount'],
                              },
                            ],
                          },
                        },
                        "batchSize": {
                          "type": "integer",
                          "title": "Batch Size",
                          "description": "Total size of all messages in batch, in bytes, to be released.",
                          "x-ms-visibility": "important",
                          'x-ms-input-dependencies': {
                            type: 'visibility',
                            parameters: [
                              {
                                name: 'configurations.$$batchName$$.releaseCriteria.type',
                                values: ['batchSize'],
                              },
                            ],
                          },
                        },
                        "recurrence": {
                          "type": "object",
                          "title": "Recurrence",
                          "description": "Enter the recurrence details.",
                          "x-ms-visibility": "important",
                          "x-ms-editor": "recurrence",
                          "x-ms-editor-options": {
                            "recurrenceType": "advanced"
                          },
                          "x-ms-input-dependencies": {
                            "type": "visibility",
                            "parameters": [
                              {
                                name: 'configurations.$$batchName$$.releaseCriteria.type',
                                values: ['recurrence'],
                              },
                            ],
                          },
                        }
                      },
                      "required": ["type"]
                    }
                  },
                  "required": ["name", "releaseCriteria"]
                }
              },
              "required": ["$$batchName$$"]
            }
        },
        "required": [ "mode", "configurations" ]
    },
    "inputsLocation": [
        "inputs"
    ],
    "isInputsOptional": false,
    "outputs": {
      "type": "object",
      "properties": {
        "body": {
          "type": "object",
          "title": "Body",
          "properties": {
            "batchName": {
              "type": "string",
              "title": "Batch Name"
            },
            "partitionName": {
              "type": "string",
              "title": "Partition Name"
            },
            "items": {
              "type": "array",
              "title": "Batched Items",
              "items": {
                "type": "object",
                "title": "Message",
                "properties": {
                  "content": {
                    "title": "Content"
                  },
                  "messageId": {
                    "type": "string",
                    "title": "Id"
                  }
                },
                "required": ["content", "messageId"]
              }
            }
          },
          "required": ["batchName", "partitionName", "items"]
        }
      },
      "required": ["body"]
    },
    "isOutputsOptional": false,
    "settings": {
        "secureData": {},
    },
    "includeRootOutputs": false,
    "connector": {
        "name": "batch",
        "id": batchConnectorId,
        "properties": {
            "displayName": "Batch",
            "iconUri": "https://logicappsv2resources.blob.core.windows.net/icons/apimanagement.svg",
            "brandColor": '#2280CC',
            "description": "Batch operations"
        }
    },
  }
} as any;

const sendBatchManifest = {
  properties: {
    "brandColor": '#2280CC',
    "iconUri": "https://logicappsv2resources.blob.core.windows.net/icons/apimanagement.svg",
    "description": "Send to Batch",
    "inputs": {
        "type": "object",
        "properties": {
            "batchName":{
              "type": 'string',
              "title": "Batch Name",
              "description": "Name of the batch to send message.",
            },
            "content": {
              "title": "Message Content",
              "description": "The message to send to batch.",
            },
            "partitionName": {
              "type": 'string',
              "title": "Partition Name",
              "description": "Name of the partition to send message.",
            },
            "messageId": {
              "type": 'string',
              "title": "Message Id",
              "description": "The message identifier.",
            },
            "host": {
              "type": "object",
              "properties": {
                "triggerName":{
                    "type": "string",
                    "title": "Trigger Name",
                    "description": "Name of the trigger",
                },
                "workflow": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "title": "Workflow",
                      "description": "Workflow name"
                    }
                  },
                  "required": [ "id" ]
                }
              },
              "required": [ "triggerName", "workflow" ]
            }
        },
        "required": [ "host", "batchName", "content" ]
    },
    "inputsLocation": [
        "inputs"
    ],
    "isInputsOptional": false,
    "outputs": {
      type: 'object',
      required: [],
      properties: {
        body: {
          title: 'Body',
          type: 'object',
          properties: {
            "batchName":{
              "type": 'string',
              "title": "Batch Name",
              "description": "Name of the batch to send message.",
            },
            "messageId": {
              "type": 'string',
              "title": "Message Id",
              "description": "The message identifier.",
            },
            "partitionName": {
              "type": 'string',
              "title": "Partition Name",
              "description": "Name of the partition to send message.",
            }
          }
        },
        headers: {
          type: 'object',
          title: 'Headers',
        },
        statusCode: {
          type: 'integer',
          title: 'Status code',
        },
      },
    },
    "isOutputsOptional": false,
    "settings": {
        "secureData": {},
        "trackedProperties": {
            "scopes": [
                "Action"
            ]
        },
    },
    "includeRootOutputs": false,
    "connector": {
        "name": "batch",
        "id": batchConnectorId,
        "properties": {
            "displayName": "Batch",
            "iconUri": "https://logicappsv2resources.blob.core.windows.net/icons/apimanagement.svg",
            "brandColor": '#2280CC',
            "description": "Batch operations"
        }
    },
  }
} as any;
