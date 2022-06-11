import type { IHttpClient } from '../httpClient';
import type { IOperationManifestService } from '../operationmanifest';
import { ExpressionParser, isFunction, isStringLiteral, isTemplateExpression } from '@microsoft-logic-apps/parsers';
import type { Expression, ExpressionFunction, ExpressionLiteral } from '@microsoft-logic-apps/parsers';
import {
  ArgumentException,
  AssertionErrorCode,
  AssertionException,
  clone,
  equals,
  format,
  SettingScope,
  UnsupportedException,
} from '@microsoft-logic-apps/utils';
import type { OperationInfo, OperationManifest, SplitOn } from '@microsoft-logic-apps/utils';

type SchemaObject = OpenAPIV2.SchemaObject;

const invokefunction = 'invokefunction';
const javascriptcode = 'javascriptcode';
const compose = 'compose';
const function_ = 'function';
const liquid = 'liquid';
const serviceprovider = 'serviceprovider';
const workflow = 'workflow';
const xmlvalidation = 'xmlvalidation';
const xslt = 'xslt';
const flatfiledecoding = 'flatfiledecoding';
const flatfileencoding = 'flatfileencoding';
const swiftdecode = 'swiftdecode';
const swiftencode = 'swiftencode';
const scope = 'scope';
const foreach = 'foreach';
const initializevariable = 'initializevariable';
const incrementvariable = 'incrementvariable';
const request = 'request';
const response = 'response';

export const azureFunctionConnectorId = '/connectionProviders/azureFunctionOperation';

const supportedManifestTypes = [
  compose,
  foreach,
  function_,
  initializevariable,
  incrementvariable,
  invokefunction,
  javascriptcode,
  liquid,
  request,
  response,
  serviceprovider,
  workflow,
  xmlvalidation,
  xslt,
  flatfiledecoding,
  flatfileencoding,
  scope,
  swiftdecode,
  swiftencode,
];

export type getAccessTokenType = () => Promise<string>;

interface StandardOperationManifestServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  supportedTypes?: string[];
}

export class StandardOperationManifestService implements IOperationManifestService {
  constructor(private readonly options: StandardOperationManifestServiceOptions) {
    const { apiVersion, baseUrl, httpClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!httpClient) {
      throw new ArgumentException('httpClient required');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSupported(operationType: string, _operationKind?: string): boolean {
    const { supportedTypes } = this.options;
    const normalizedOperationType = operationType.toLowerCase();
    return supportedTypes
      ? supportedTypes.indexOf(normalizedOperationType) > -1
      : supportedManifestTypes.indexOf(normalizedOperationType) > -1;
  }

  async getOperationInfo(definition: any): Promise<OperationInfo> {
    if (isInBuiltOperation(definition)) {
      return getBuiltInOperationInfo(definition);
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

  async getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest> {
    if (operationId === foreach) {
      return foreachManifest;
    }
    if (operationId === scope) {
      return scopeManifest;
    }

    // NOTE: HACK to get operation manifest of dataOperation connector's action,
    // should be removed when all manifests are created inside dataoperation.
    if (equals(connectorId, 'connectionProviders/dataOperation')) {
      // eslint-disable-next-line no-param-reassign
      connectorId = 'connectionProviders/dataOperationNew';
    }

    const { apiVersion, baseUrl, httpClient } = this.options;
    const connectorName = connectorId.split('/').slice(-1)[0];
    const operationName = operationId.split('/').slice(-1)[0];
    const queryParameters = {
      'api-version': apiVersion,
      expand: 'properties/manifest',
    };

    try {
      const response = await httpClient.get<any>({
        uri: `${baseUrl}/operationGroups/${connectorName}/operations/${operationName}`,
        queryParameters,
      });

      const {
        properties: { brandColor, description, iconUri, manifest },
      } = response;

      const operationManifest = {
        properties: { brandColor, description, iconUri, ...manifest },
      };

      return operationManifest;
    } catch (error) {
      return { properties: {} } as any;
    }
  }

  getSplitOnOutputs(manifest: OperationManifest, splitOn: SplitOn): SchemaObject {
    if (splitOn === undefined) {
      return manifest.properties.outputs;
    } else if (typeof splitOn === 'string') {
      return this._convertOutputsForSplitOn(manifest.properties.outputs, splitOn);
    }

    throw new AssertionException(AssertionErrorCode.INVALID_SPLITON, format("Invalid split on format in '{0}'.", splitOn));
  }

  /**
   * Gets the outputs from manifest outputs after applying split on.
   * @arg {Swagger.Schema} originalOutputs - The original outputs in manifest outputs definition.
   * @arg {string} splitOn - The splitOn value for the batch trigger.
   * @return {Swagger.Schema}
   */
  private _convertOutputsForSplitOn(originalOutputs: SchemaObject, splitOnValue: string): SchemaObject {
    if (!isTemplateExpression(splitOnValue)) {
      throw new AssertionException(AssertionErrorCode.INVALID_SPLITON, format("Invalid split on format in '{0}'.", splitOnValue));
    }

    const parsedValue = ExpressionParser.parseExpression(splitOnValue);
    const properties: string[] = [];
    let manifestSection = originalOutputs;
    if (isSupportedSplitOnExpression(parsedValue)) {
      const { dereferences, name } = parsedValue as ExpressionFunction;
      if (equals(name, 'triggerBody')) {
        properties.push('body');
      }

      if (dereferences.length) {
        properties.push(...dereferences.map((dereference) => (dereference.expression as ExpressionLiteral).value));
      }
    } else {
      throw new AssertionException(AssertionErrorCode.INVALID_SPLITON, format("Invalid split on format in '{0}'.", splitOnValue));
    }

    for (const property of properties) {
      if (!manifestSection.properties) {
        throw new AssertionException(
          AssertionErrorCode.INVALID_SPLITON,
          format("Invalid split on value '{0}', cannot find in outputs.", splitOnValue)
        );
      }

      manifestSection = manifestSection.properties[property];
    }

    if (manifestSection.type !== 'array') {
      throw new AssertionException(
        AssertionErrorCode.INVALID_SPLITON,
        format("Invalid type on split on value '{0}', split on not in array.", splitOnValue)
      );
    }

    return {
      properties: {
        body: clone(manifestSection.items) as SchemaObject,
      },
      type: 'object',
    };
  }
}

function isSupportedSplitOnExpression(expression: Expression): boolean {
  if (!isFunction(expression)) {
    return false;
  }

  if (!equals(expression.name, 'triggerBody') && !equals(expression.name, 'triggerOutputs')) {
    return false;
  }

  if (expression.arguments.length > 0) {
    return false;
  }

  if (expression.dereferences.some((dereference) => !isStringLiteral(dereference.expression))) {
    return false;
  }

  return true;
}

function isServiceProviderOperation(definition: any): boolean {
  return equals(definition.type, 'ServiceProvider');
}

function isInBuiltOperation(definition: any): boolean {
  switch (definition.type.toLowerCase()) {
    case compose:
    case foreach:
    case function_:
    case initializevariable:
    case incrementvariable:
    case invokefunction:
    case javascriptcode:
    case liquid:
    case request:
    case response:
    case workflow:
    case xslt:
    case xmlvalidation:
    case flatfiledecoding:
    case flatfileencoding:
    case scope:
    case swiftdecode:
    case swiftencode:
      return true;

    default:
      return false;
  }
}

function getBuiltInOperationInfo(definition: any): OperationInfo {
  const normalizedOperationType = definition.type.toLowerCase();
  const kind = definition.kind ? definition.kind.toLowerCase() : undefined;

  if (kind === undefined) {
    return inBuiltOperationsMetadata[normalizedOperationType];
  }

  const liquidConnectorId = 'connectionProviders/liquidOperations';
  switch (normalizedOperationType) {
    case liquid:
      switch (kind) {
        case 'jsontojson':
          return {
            connectorId: liquidConnectorId,
            operationId: 'liquidJsonToJson',
          };
        case 'jsontotext':
          return {
            connectorId: liquidConnectorId,
            operationId: 'liquidJsonToText',
          };
        case 'xmltojson':
          return {
            connectorId: liquidConnectorId,
            operationId: 'liquidXmlToJson',
          };
        case 'xmltotext':
          return {
            connectorId: liquidConnectorId,
            operationId: 'liquidXmlToText',
          };
        default:
          throw new UnsupportedException(`Unsupported operation kind ${kind}`);
      }
    case request:
      switch (kind) {
        case 'http':
          return {
            connectorId: 'connectionProviders/request',
            operationId: 'request',
          };
        default:
          throw new UnsupportedException(`Unsupported operation kind ${kind} for request type`);
      }
    case response:
      switch (kind) {
        case 'http':
          return {
            connectorId: 'connectionProviders/request',
            operationId: 'response',
          };
        default:
          throw new UnsupportedException(`Unsupported operation kind ${kind} for response type`);
      }
    default:
      throw new UnsupportedException(`Unsupported built in operation type ${normalizedOperationType}`);
  }
}

const inBuiltOperationsMetadata: Record<string, OperationInfo> = {
  [compose]: {
    connectorId: 'connectionProviders/dataOperationNew',
    operationId: 'composeNew',
  },
  [foreach]: {
    connectorId: 'connectionProviders/control',
    operationId: 'foreach',
  },
  [function_]: {
    connectorId: azureFunctionConnectorId,
    operationId: 'azureFunction',
  },
  [initializevariable]: {
    connectorId: 'connectionProviders/variable',
    operationId: 'initializevariable',
  },
  [incrementvariable]: {
    connectorId: 'connectionProviders/variable',
    operationId: 'incrementvariable',
  },
  [invokefunction]: {
    connectorId: 'connectionProviders/localFunctionOperation',
    operationId: 'invokeFunction',
  },
  [javascriptcode]: {
    connectorId: 'connectionProviders/inlineCode',
    operationId: 'javaScriptCode',
  },
  [workflow]: {
    connectorId: 'connectionProviders/localWorkflowOperation',
    operationId: 'invokeWorkflow',
  },
  [xmlvalidation]: {
    connectorId: 'connectionProviders/xmlOperations',
    operationId: 'xmlValidation',
  },
  [xslt]: {
    connectorId: 'connectionProviders/xmlOperations',
    operationId: 'xmlTransform',
  },
  [flatfiledecoding]: {
    connectorId: 'connectionProviders/flatFileOperations',
    operationId: 'flatFileDecoding',
  },
  [flatfileencoding]: {
    connectorId: 'connectionProviders/flatFileOperations',
    operationId: 'flatFileEncoding',
  },
  [scope]: {
    connectorId: 'connectionProviders/control',
    operationId: 'scope',
  },
  [swiftdecode]: {
    connectorId: 'connectionProviders/swiftOperations',
    operationId: 'swiftDecode',
  },
  [swiftencode]: {
    connectorId: 'connectionProviders/swiftOperations',
    operationId: 'swiftEncode',
  },
};

const foreachManifest: OperationManifest = {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzQ4Njk5MSIvPg0KIDxwYXRoIGQ9Ik0xMSAyMGg3LjJsMSAxaC05LjJ2LTguM2wtMS4zIDEuMy0uNy0uNyAyLjUtMi41IDIuNSAyLjUtLjcuNy0xLjMtMS4zem0xMi4zLTJsLjcuNy0yLjUgMi41LTIuNS0yLjUuNy0uNyAxLjMgMS4zdi03LjNoLTcuMmwtMS0xaDkuMnY4LjN6IiBmaWxsPSIjZmZmIi8+DQo8L3N2Zz4NCg==',
    brandColor: '#486991',
    description: 'Executes a block of actions for each item in the input array.',

    allowChildOperations: true,

    inputs: {
      type: 'array',
      title: 'Select an output from previous steps',
    },
    inputsLocation: ['foreach'],
    isInputsOptional: false,

    outputs: {},
    isOutputsOptional: false,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
};

const scopeManifest: OperationManifest = {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzhDMzkwMCIvPg0KIDxwYXRoIGQ9Im04IDEwaDE2djEyaC0xNnptMTUgMTF2LTEwaC0xNHYxMHptLTItOHY2aC0xMHYtNnptLTEgNXYtNGgtOHY0eiIgZmlsbD0iI2ZmZiIvPg0KPC9zdmc+DQo=',
    brandColor: '#8C3900',
    description: 'Encapsulate a block of actions and inherit the last terminal status (Succeeded, Failed, Cancelled) of actions inside.',

    allowChildOperations: true,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
};
