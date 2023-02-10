import { BaseOperationManifestService } from '../base';
import { azureFunctionConnectorId, getBuiltInOperationInfo, isBuiltInOperation, supportedBaseManifestObjects } from '../base/operationmanifest';
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
    const supportedManifest = supportedBaseManifestObjects.get(operationId);

    if (supportedManifest) return supportedManifest;

    if (equals(connectorId, azureFunctionConnectorId)) {
      return apimManifest;
    }

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

const apimManifest = {
  properties: {
    "brandColor": "#68217a",
    "iconUri": "https://logicappsv2resources.blob.core.windows.net/icons/apimanagement.svg",
    "description": "Call an Azure API Management API.",
    "inputs": {
        "type": "object",
        "properties": {
            "apiManagement": {
              "type": "object",
              "properties": {
                "operationId":{
                    "type": "string",
                    "title": "Operation Id",
                    "description": "Operation Id",
                    "x-ms-dynamic-list": {
                        "dynamicState": {
                            "operationId": "getApimOperations",
                            "parameters": {}
                        },
                        "parameters": {}
                    }
                }
              },
              "required": [ "operationId" ]
            },
            "operationDetails":{
                "title": "Operation Parameters",
                "description": "Operation parameters for the above operation",
                "x-ms-dynamic-properties": {
                    "dynamicState": {
                        "extension": {
                            "operationId": "getApimOperationSchema",
                        },
                        "isInput": true
                    },
                    "parameters": {
                        "operationId": {
                            "parameterReference": "apiManagement.operationId",
                            "required": true
                        }
                    }
                },
            }
        },
        "required": [
            "apiManagement"
        ]
    },
    "inputsLocation": [
        "inputs"
    ],
    "inputsLocationSwapMap": [{ "source": [ "operationDetails" ], "target": [] }],
    "isInputsOptional": false,
    "outputs": {
      "x-ms-dynamic-properties": {
        "dynamicState": {
            "extension": {
                "operationId": "getApimOperationSchema",
            },
        },
        "parameters": {
            "operationId": {
                "parameterReference": "apiManagement.operationId",
                "required": true
            }
        }
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
        "retryPolicy": {
            "scopes": [
                "Action"
            ]
        },
        "operationOptions": {
            "options": [
                "DisableAsyncPattern"
            ],
            "scopes": [
                "Action"
            ]
        }
    },
    "includeRootOutputs": true,
    "connectionReference": {
        "referenceKeyFormat": "apimanagement"
    },
    "connector": {
        "name": "apiManagementOperation",
        "id": "/connectionProviders/apiManagementOperation",
        "properties": {
            "displayName": "API Management operations",
            "iconUri": "https://logicappsv2resources.blob.core.windows.net/icons/apimanagement.svg",
            "brandColor": "#68217a",
            "description": "API Management operations",
            "capabilities": [
                "azureConnection"
            ],
            "connectionParameters": {
                "apiId": {
                    "type": "string"
                },
                "baseUrl": {
                    "type": "string"
                },
                "subscriptionKey": {
                    "type": "string"
                },
                "authentication": {
                    "type": "object"
                }
            }
        }
    },
    "connection": {
        "type": "apimanagement",
        "required": true
    }
  }
} as any;