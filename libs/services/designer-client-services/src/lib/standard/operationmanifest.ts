import type { IHttpClient } from '../httpClient';
import type { IOperationManifestService } from '../operationmanifest';
import conditionManifest from './manifests/condition';
import csvManifest from './manifests/csvtable';
import {
  addToTimeManifest,
  convertTimezoneManifest,
  currentTimeManifest,
  getFutureTimeManifest,
  getPastTimeManifest,
  subtractFromTimeManifest,
} from './manifests/datetime';
import foreachManifest from './manifests/foreach';
import htmlManifest from './manifests/htmltable';
import { httpTriggerManifest, httpWithSwaggerManifest, httpWebhookManifest } from './manifests/http';
import joinManifest from './manifests/join';
import parsejsonManifest from './manifests/parsejson';
import queryManifest from './manifests/query';
import requestManifest from './manifests/request';
import responseManifest from './manifests/response';
import { delayManifest, delayUntilManifest, recurrenceManifest, slidingWindowManifest } from './manifests/schedule';
import scopeManifest from './manifests/scope';
import selectManifest from './manifests/select';
import switchManifest from './manifests/switch';
import terminateManifest from './manifests/terminate';
import untilManifest from './manifests/until';
import {
  appendArrayManifest,
  appendStringManifest,
  decrementManifest,
  incrementManifest,
  initializeManifest,
  setManifest,
} from './manifests/variables';
import { ExpressionParser, isFunction, isStringLiteral, isTemplateExpression } from '@microsoft-logic-apps/parsers';
import type { Expression, ExpressionFunction, ExpressionLiteral } from '@microsoft-logic-apps/parsers';
import {
  ArgumentException,
  AssertionErrorCode,
  AssertionException,
  clone,
  ConnectionType,
  equals,
  format,
  UnsupportedException,
} from '@microsoft-logic-apps/utils';
import type { OperationInfo, OperationManifest, SplitOn } from '@microsoft-logic-apps/utils';

type SchemaObject = OpenAPIV2.SchemaObject;

const invokefunction = 'invokefunction';
const javascriptcode = 'javascriptcode';
const compose = 'compose';
const csvtable = 'csvtable';
const htmltable = 'htmltable';
const join = 'join';
const parsejson = 'parsejson';
const query = 'query';
const select = 'select';
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
const condition = 'if';
const switchType = 'switch';
const request = 'request';
const response = 'response';
const table = 'table';
const terminate = 'terminate';
const until = 'until';
const expression = 'expression';
const addtotime = 'addtotime';
const converttimezone = 'converttimezone';
const currenttime = 'currenttime';
const getfuturetime = 'getfuturetime';
const getpasttime = 'getpasttime';
const subtractfromtime = 'subtractfromtime';
const recurrence = 'recurrence';
const slidingwindow = 'slidingwindow';
const wait = 'wait';
const delay = 'delay';
const delayuntil = 'delayuntil';
const http = 'http';
const httpwebhook = 'httpwebhook';
const httpwithswagger = 'httpwithswagger';
const initializevariable = 'initializevariable';
const setvariable = 'setvariable';
const incrementvariable = 'incrementvariable';
const decrementvariable = 'decrementvariable';
const appendtoarrayvariable = 'appendtoarrayvariable';
const appendtostringvariable = 'appendtostringvariable';

export const azureFunctionConnectorId = '/connectionProviders/azureFunctionOperation';
const dataOperationConnectorId = 'connectionProviders/dataOperationNew';
const controlConnectorId = 'connectionProviders/control';
const dateTimeConnectorId = 'connectionProviders/datetime';
const scheduleConnectorId = 'connectionProviders/schedule';
const httpConnectorId = 'connectionProviders/http';
const variableConnectorId = 'connectionProviders/variable';

const supportedManifestTypes = [
  appendtoarrayvariable,
  appendtostringvariable,
  compose,
  condition,
  decrementvariable,
  expression,
  foreach,
  function_,
  http,
  httpwebhook,
  initializevariable,
  incrementvariable,
  invokefunction,
  javascriptcode,
  join,
  liquid,
  parsejson,
  query,
  recurrence,
  request,
  response,
  select,
  setvariable,
  slidingwindow,
  switchType,
  serviceprovider,
  table,
  workflow,
  xmlvalidation,
  xslt,
  flatfiledecoding,
  flatfileencoding,
  scope,
  swiftdecode,
  swiftencode,
  terminate,
  until,
  wait,
];

export type getAccessTokenType = () => Promise<string>;

export interface StandardOperationManifestServiceOptions {
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
    const supportedManifest = supportedManifestObjects.get(operationId);

    if (supportedManifest) {
      return supportedManifest;
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

      // TODO(psamband): Remove below patching of connection when backend api sends correct information for service providers
      const operationManifest = {
        properties: {
          brandColor,
          description,
          iconUri,
          connection: equals(operationType, 'serviceprovider') ? { required: true, type: ConnectionType.ServiceProvider } : undefined,
          ...manifest
        },
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
    case appendtoarrayvariable:
    case appendtostringvariable:
    case compose:
    case condition:
    case decrementvariable:
    case expression:
    case foreach:
    case function_:
    case http:
    case httpwebhook:
    case initializevariable:
    case incrementvariable:
    case invokefunction:
    case javascriptcode:
    case join:
    case liquid:
    case parsejson:
    case query:
    case recurrence:
    case request:
    case response:
    case select:
    case setvariable:
    case slidingwindow:
    case switchType:
    case workflow:
    case xslt:
    case xmlvalidation:
    case flatfiledecoding:
    case flatfileencoding:
    case scope:
    case swiftdecode:
    case swiftencode:
    case table:
    case terminate:
    case until:
    case wait:
      return true;

    default:
      return false;
  }
}

function getBuiltInOperationInfo(definition: any): OperationInfo {
  const normalizedOperationType = definition.type.toLowerCase();
  const kind = definition.kind ? definition.kind.toLowerCase() : undefined;

  if (kind === undefined) {
    const operationInfo = inBuiltOperationsMetadata[normalizedOperationType];
    if (operationInfo) {
      return operationInfo;
    }
  }

  const liquidConnectorId = 'connectionProviders/liquidOperations';
  switch (normalizedOperationType) {
    case expression:
      switch (definition.kind?.toLowerCase()) {
        case addtotime:
        case converttimezone:
        case currenttime:
        case getfuturetime:
        case getpasttime:
        case subtractfromtime:
          return {
            connectorId: dateTimeConnectorId,
            operationId: definition.kind.toLowerCase(),
          };

        default:
          throw new UnsupportedException(`Unsupported datetime kind '${definition.kind}'`);
      }

    case http:
      return {
        connectorId: httpConnectorId,
        operationId:
          definition.inputs?.metadata?.apiDefinitionUrl && equals(definition.inputs?.metadata?.swaggerSource, 'custom')
            ? httpwithswagger
            : http,
      };

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
    case table:
      switch (definition.inputs?.format?.toLowerCase()) {
        case 'csv':
          return {
            connectorId: dataOperationConnectorId,
            operationId: csvtable,
          };

        case 'html':
          return {
            connectorId: dataOperationConnectorId,
            operationId: htmltable,
          };

        default:
          throw new UnsupportedException(`Unsupported table format ${definition.inputs?.format} for table type`);
      }

    case wait:
      return {
        connectorId: scheduleConnectorId,
        operationId: definition.inputs?.until ? delayuntil : delay,
      };

    default:
      throw new UnsupportedException(`Unsupported built in operation type ${normalizedOperationType}`);
  }
}

const inBuiltOperationsMetadata: Record<string, OperationInfo> = {
  [appendtoarrayvariable]: {
    connectorId: variableConnectorId,
    operationId: appendtoarrayvariable,
  },
  [appendtostringvariable]: {
    connectorId: variableConnectorId,
    operationId: appendtostringvariable,
  },
  [compose]: {
    connectorId: dataOperationConnectorId,
    operationId: 'composeNew',
  },
  [condition]: {
    connectorId: controlConnectorId,
    operationId: condition,
  },
  [decrementvariable]: {
    connectorId: variableConnectorId,
    operationId: decrementvariable,
  },
  [foreach]: {
    connectorId: controlConnectorId,
    operationId: foreach,
  },
  [function_]: {
    connectorId: azureFunctionConnectorId,
    operationId: 'azureFunction',
  },
  [httpwebhook]: {
    connectorId: httpConnectorId,
    operationId: httpwebhook,
  },
  [initializevariable]: {
    connectorId: variableConnectorId,
    operationId: initializevariable,
  },
  [incrementvariable]: {
    connectorId: variableConnectorId,
    operationId: incrementvariable,
  },
  [invokefunction]: {
    connectorId: 'connectionProviders/localFunctionOperation',
    operationId: 'invokeFunction',
  },
  [javascriptcode]: {
    connectorId: 'connectionProviders/inlineCode',
    operationId: 'javaScriptCode',
  },
  [join]: {
    connectorId: dataOperationConnectorId,
    operationId: join,
  },
  [parsejson]: {
    connectorId: dataOperationConnectorId,
    operationId: parsejson,
  },
  [query]: {
    connectorId: dataOperationConnectorId,
    operationId: query,
  },
  [recurrence]: {
    connectorId: scheduleConnectorId,
    operationId: recurrence,
  },
  [select]: {
    connectorId: dataOperationConnectorId,
    operationId: select,
  },
  [setvariable]: {
    connectorId: variableConnectorId,
    operationId: setvariable,
  },
  [slidingwindow]: {
    connectorId: scheduleConnectorId,
    operationId: slidingwindow,
  },
  [switchType]: {
    connectorId: controlConnectorId,
    operationId: switchType,
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
    connectorId: controlConnectorId,
    operationId: scope,
  },
  [swiftdecode]: {
    connectorId: 'connectionProviders/swiftOperations',
    operationId: 'swiftDecode',
  },
  [swiftencode]: {
    connectorId: 'connectionProviders/swiftOperations',
    operationId: 'swiftEncode',
  },
  [terminate]: {
    connectorId: controlConnectorId,
    operationId: terminate,
  },
  [until]: {
    connectorId: controlConnectorId,
    operationId: until,
  },
};

const supportedManifestObjects = new Map<string, OperationManifest>([
  [appendtoarrayvariable, appendArrayManifest],
  [appendtostringvariable, appendStringManifest],
  [addtotime, addToTimeManifest],
  [condition, conditionManifest],
  [converttimezone, convertTimezoneManifest],
  [csvtable, csvManifest],
  [currenttime, currentTimeManifest],
  [decrementvariable, decrementManifest],
  [delay, delayManifest],
  [delayuntil, delayUntilManifest],
  [foreach, foreachManifest],
  [getfuturetime, getFutureTimeManifest],
  [getpasttime, getPastTimeManifest],
  [htmltable, htmlManifest],
  [http, httpTriggerManifest],
  [httpwebhook, httpWebhookManifest],
  [httpwithswagger, httpWithSwaggerManifest],
  [incrementvariable, incrementManifest],
  [initializevariable, initializeManifest],
  [join, joinManifest],
  [parsejson, parsejsonManifest],
  [query, queryManifest],
  [recurrence, recurrenceManifest],
  [request, requestManifest],
  [response, responseManifest],
  [scope, scopeManifest],
  [select, selectManifest],
  [setvariable, setManifest],
  [slidingwindow, slidingWindowManifest],
  [subtractfromtime, subtractFromTimeManifest],
  [switchType, switchManifest],
  [terminate, terminateManifest],
  [until, untilManifest],
]);
