import type { OperationInfo, OperationManifest } from '../../../utils/src';
import { ArgumentException, UnsupportedException, equals } from '../../../utils/src';
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
import {
  httpManifest,
  httpTriggerManifest,
  httpWithSwaggerManifest,
  httpWithSwaggerTriggerManifest,
  httpWebhookManifest,
  httpWebhookTriggerManifest,
} from './manifests/http';
import {
  appendArrayManifest,
  appendStringManifest,
  decrementManifest,
  incrementManifest,
  initializeManifest,
  setManifest,
} from './manifests/variables';
import joinManifest from './manifests/join';
import parsejsonManifest from './manifests/parsejson';
import queryManifest from './manifests/query';
import requestManifest from './manifests/request';
import a2aRequestManifest from './manifests/a2arequest';
import responseManifest from './manifests/response';
import { delayManifest, delayUntilManifest, recurrenceManifest, slidingWindowManifest } from './manifests/schedule';
import scopeManifest from './manifests/scope';
import selectManifest from './manifests/select';
import switchManifest from './manifests/switch';
import agentloopManifest from '../standard/manifest/agentloop';
import handoffManifest from '../standard/manifest/handoff';
import terminateManifest from './manifests/terminate';
import untilManifest from './manifests/until';

const apimanagement = 'apimanagement';
const apimanagementtrigger = 'apimanagementtrigger';
const as2Encode = 'as2encode';
const as2Decode = 'as2decode';
const integrationaccountartifactlookup = 'integrationaccountartifactlookup';
const rosettanetencode = 'rosettanetencode';
const rosettanetdecode = 'rosettanetdecode';
const rosettanetwaitforresponse = 'rosettanetwaitforresponse';
const invokefunction = 'invokefunction';
const javascriptcode = 'javascriptcode';
const powershellcode = 'powershellcode';
const csharpcode = 'csharpscriptcode';
const compose = 'compose';
const csvtable = 'csvtable';
const htmltable = 'htmltable';
const join = 'join';
export const parsejson = 'parsejson';
export const query = 'query';
export const select = 'select';
const function_ = 'function';
const liquid = 'liquid';
const serviceprovider = 'serviceprovider';
const workflow = 'workflow';
const nestedAgent = 'nestedagent';
const xmlvalidation = 'xmlvalidation';
const xslt = 'xslt';
const xmlcompose = 'xmlcompose';
const xmlparse = 'xmlparse';
export const flatfiledecoding = 'flatfiledecoding';
export const flatfileencoding = 'flatfileencoding';
const swiftdecode = 'swiftdecode';
const swiftencode = 'swiftencode';
const swiftmtdecode = 'swiftmtdecode';
const swiftmtencode = 'swiftmtencode';
const ruleexecute = 'ruleexecute';
const scope = 'scope';
const foreach = 'foreach';
const condition = 'if';
const switchType = 'switch';
export const agentType = 'agent';
export const handoff = 'agenthandoff';
const request = 'request';
const a2arequest = 'a2arequest';
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
export const httpaction = 'httpaction';
const httptrigger = 'httptrigger';
export const httpswaggeraction = 'httpswaggeraction';
const httpswaggertrigger = 'httpswaggertrigger';
export const httpwebhookaction = 'httpwebhookaction';
const httpwebhooktrigger = 'httpwebhooktrigger';
const initializevariable = 'initializevariable';
const setvariable = 'setvariable';
const incrementvariable = 'incrementvariable';
const decrementvariable = 'decrementvariable';
const appendtoarrayvariable = 'appendtoarrayvariable';
const appendtostringvariable = 'appendtostringvariable';
const batch = 'batch';
const sendtobatch = 'sendtobatch';
const xslttransform = 'xslttransform';
const datamapper = 'datamapper';
const x12encode = 'x12encode';
const x12batchencode = 'x12batchencode';
const x12decode = 'x12decode';
const edifactencode = 'edifactencode';
const edifactbatchencode = 'edifactbatchencode';
const edifactdecode = 'edifactdecode';
const parsedocument = 'parsedocument';
export const parsedocumentwithmetadata = 'parsedocumentwithmetadata';
export const chunktextwithmetadata = 'chunktextwithmetadata';

export const apiManagementConnectorId = '/connectionProviders/apiManagementOperation';
export const azureFunctionConnectorId = '/connectionProviders/azureFunctionOperation';
export const appServiceConnectorId = '/connectionProviders/appService';
export const batchConnectorId = '/connectionProviders/batch';
export const dataOperationConnectorId = 'connectionProviders/dataOperationNew';
const controlConnectorId = 'connectionProviders/control';
export const agentConnectorId = 'connectionProviders/agent';
const localWorkflowConnectorId = 'connectionProviders/localWorkflowOperation';
const dateTimeConnectorId = 'connectionProviders/datetime';
const scheduleConnectorId = 'connectionProviders/schedule';
export const httpConnectorId = 'connectionProviders/http';
const variableConnectorId = 'connectionProviders/variable';
const rosettanetConnectorId = 'connectionProviders/rosettaNetOperations';
export const flatFileConnectorId = 'connectionProviders/flatFileOperations';
const liquidConnectorId = 'connectionProviders/liquidOperations';
const dataMapperConnectorId = 'connectionProviders/dataMapperOperations';
const x12ConnectorId = 'connectionProviders/x12Operations';
const xmlOperationsConnectionId = 'connectionProviders/xmlOperations';
const edifactConnectorId = 'connectionProviders/edifactOperations';
export const inlineCodeConnectorId = 'connectionProviders/inlineCode';

const azurefunction = 'azurefunction';
const appservice = 'appservice';
const appservicetrigger = 'appservicetrigger';
const invokeworkflow = 'invokeworkflow';
const invokenestedagent = 'invokenestedagent';
const chunktext = 'chunktext';

export const supportedBaseManifestTypes = [
  apimanagement,
  appendtoarrayvariable,
  appendtostringvariable,
  as2Encode,
  as2Decode,
  batch,
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
  integrationaccountartifactlookup,
  invokefunction,
  javascriptcode,
  powershellcode,
  csharpcode,
  join,
  liquid,
  parsejson,
  query,
  recurrence,
  request,
  a2arequest,
  response,
  rosettanetdecode,
  rosettanetencode,
  rosettanetwaitforresponse,
  sendtobatch,
  select,
  setvariable,
  slidingwindow,
  switchType,
  agentType,
  handoff,
  serviceprovider,
  table,
  workflow,
  nestedAgent,
  xmlvalidation,
  xslt,
  xmlcompose,
  xmlparse,
  flatfiledecoding,
  flatfileencoding,
  scope,
  swiftdecode,
  swiftencode,
  swiftmtdecode,
  swiftmtencode,
  ruleexecute,
  terminate,
  until,
  wait,
  xslttransform,
  x12encode,
  x12batchencode,
  x12decode,
  edifactencode,
  edifactbatchencode,
  edifactdecode,
  chunktext,
  parsedocument,
  parsedocumentwithmetadata,
  chunktextwithmetadata,
];

export const builtInConnectorIds = {
  dataOperation: dataOperationConnectorId,
  control: controlConnectorId,
  agent: agentConnectorId,
  dateTime: dateTimeConnectorId,
  schedule: scheduleConnectorId,
  http: httpConnectorId,
  variable: variableConnectorId,
};

export type getAccessTokenType = () => Promise<string>;

export interface BaseOperationManifestServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  supportedTypes?: string[];
}

export abstract class BaseOperationManifestService implements IOperationManifestService {
  constructor(readonly options: BaseOperationManifestServiceOptions) {
    const { apiVersion, baseUrl, httpClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }
    if (!httpClient) {
      throw new ArgumentException('httpClient required');
    }
  }

  isSupported(operationType?: string, _operationKind?: string): boolean {
    const { supportedTypes } = this.options;
    const normalizedOperationType = operationType?.toLowerCase() ?? '';
    return supportedTypes
      ? supportedTypes.indexOf(normalizedOperationType) > -1
      : supportedBaseManifestTypes.indexOf(normalizedOperationType) > -1;
  }

  isAliasingSupported(): boolean {
    return false;
  }

  getOperation(_connectorId: string, _operationId: string, _useCachedData?: boolean): Promise<any> {
    throw new UnsupportedException('getOperation not implemented for this service');
  }

  abstract getOperationInfo(definition: any, isTrigger: boolean): Promise<OperationInfo>;

  abstract getOperationManifest(_connectorId: string, _operationId: string): Promise<OperationManifest>;

  abstract isBuiltInConnector(connectorId: string): boolean;

  abstract getBuiltInConnector(connectorId: string): any;
}

export function isBuiltInOperation(definition: any): boolean {
  if (!definition?.type) {
    return false;
  }

  switch (definition?.type?.toLowerCase()) {
    case apimanagement:
    case as2Decode:
    case as2Encode:
    case batch:
    case integrationaccountartifactlookup:
    case rosettanetencode:
    case rosettanetdecode:
    case rosettanetwaitforresponse:
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
    case powershellcode:
    case csharpcode:
    case join:
    case liquid:
    case parsejson:
    case query:
    case recurrence:
    case request:
    case a2arequest:
    case response:
    case select:
    case sendtobatch:
    case setvariable:
    case slidingwindow:
    case switchType:
    case agentType:
    case handoff:
    case workflow:
    case xslt:
    case xmlcompose:
    case xmlparse:
    case xmlvalidation:
    case flatfiledecoding:
    case flatfileencoding:
    case scope:
    case swiftdecode:
    case swiftencode:
    case swiftmtdecode:
    case swiftmtencode:
    case ruleexecute:
    case table:
    case terminate:
    case until:
    case wait:
    case xslttransform:
    case x12decode:
    case x12encode:
    case x12batchencode:
    case edifactdecode:
    case edifactencode:
    case edifactbatchencode:
    case appservice:
    case azurefunction:
    case invokeworkflow:
    case nestedAgent:
    case parsedocument:
    case chunktext:
    case chunktextwithmetadata:
    case parsedocumentwithmetadata:
      return true;

    default:
      return false;
  }
}

export function getBuiltInOperationInfo(definition: any, isTrigger: boolean): OperationInfo {
  const normalizedOperationType = definition.type?.toLowerCase();
  const kind = definition.kind?.toLowerCase();

  if (kind === undefined) {
    const operationInfo = builtInOperationsMetadata[normalizedOperationType];
    if (operationInfo) {
      return operationInfo;
    }
  }

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

    case http: {
      if (equals(definition?.metadata?.swaggerSource, 'website')) {
        return {
          connectorId: appServiceConnectorId,
          operationId: isTrigger ? appservicetrigger : appservice,
        };
      }
      return {
        connectorId: httpConnectorId,
        operationId: definition?.metadata?.apiDefinitionUrl
          ? isTrigger
            ? httpswaggertrigger
            : httpswaggeraction
          : isTrigger
            ? httptrigger
            : httpaction,
      };
    }
    case httpwebhook:
      return { connectorId: httpConnectorId, operationId: isTrigger ? httpwebhooktrigger : httpwebhookaction };
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
            operationId: request,
          };
        case 'agent':
          return {
            connectorId: 'connectionProviders/a2a',
            operationId: a2arequest,
          };
        default: {
          if (kind === undefined) {
            return {
              connectorId: 'connectionProviders/request',
              operationId: request,
            };
          }
          throw new UnsupportedException(`Unsupported operation kind ${kind} for request type`);
        }
      }
    case response:
      switch (kind) {
        case 'http':
          return {
            connectorId: 'connectionProviders/request',
            operationId: response,
          };
        default: {
          if (kind === undefined) {
            return {
              connectorId: 'connectionProviders/request',
              operationId: response,
            };
          }
          throw new UnsupportedException(`Unsupported operation kind ${kind} for response type`);
        }
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

    case apimanagement:
      return {
        connectorId: apiManagementConnectorId,
        operationId: isTrigger ? apimanagementtrigger : apimanagement,
      };

    case appservice:
      return {
        connectorId: appServiceConnectorId,
        operationId: isTrigger ? appservicetrigger : appservice,
      };

    case xslt:
      switch (kind) {
        case datamapper:
          return {
            connectorId: dataMapperConnectorId,
            operationId: xslttransform,
          };
        default:
          throw new UnsupportedException(`Unsupported operation kind ${kind}`);
      }

    default:
      throw new UnsupportedException(`Unsupported built in operation type ${normalizedOperationType}`);
  }
}

const builtInOperationsMetadata: Record<string, OperationInfo> = {
  [appendtoarrayvariable]: {
    connectorId: variableConnectorId,
    operationId: appendtoarrayvariable,
  },
  [appendtostringvariable]: {
    connectorId: variableConnectorId,
    operationId: appendtostringvariable,
  },
  [as2Encode]: {
    connectorId: 'connectionProviders/as2Operations',
    operationId: as2Encode,
  },
  [as2Decode]: {
    connectorId: 'connectionProviders/as2Operations',
    operationId: as2Decode,
  },
  [batch]: {
    connectorId: batchConnectorId,
    operationId: batch,
  },
  [sendtobatch]: {
    connectorId: batchConnectorId,
    operationId: sendtobatch,
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
    operationId: azurefunction,
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
    connectorId: inlineCodeConnectorId,
    operationId: 'javaScriptCode',
  },
  [powershellcode]: {
    connectorId: inlineCodeConnectorId,
    operationId: powershellcode,
  },
  [csharpcode]: {
    connectorId: inlineCodeConnectorId,
    operationId: csharpcode,
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
  [agentType]: {
    connectorId: agentConnectorId,
    operationId: agentType,
  },
  [handoff]: {
    connectorId: agentConnectorId,
    operationId: handoff,
  },
  [workflow]: {
    connectorId: localWorkflowConnectorId,
    operationId: invokeworkflow,
  },
  [nestedAgent]: {
    connectorId: localWorkflowConnectorId,
    operationId: invokenestedagent,
  },
  [xmlcompose]: {
    connectorId: xmlOperationsConnectionId,
    operationId: 'XmlCompose',
  },
  [xmlparse]: {
    connectorId: xmlOperationsConnectionId,
    operationId: 'XmlParse',
  },
  [xmlvalidation]: {
    connectorId: xmlOperationsConnectionId,
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
  [swiftmtdecode]: {
    connectorId: 'connectionProviders/swiftOperations',
    operationId: 'swiftMTDecode',
  },
  [swiftmtencode]: {
    connectorId: 'connectionProviders/swiftOperations',
    operationId: 'swiftMTEncode',
  },
  [ruleexecute]: {
    connectorId: 'connectionProviders/ruleEngineOperations',
    operationId: 'ruleExecute',
  },
  [terminate]: {
    connectorId: controlConnectorId,
    operationId: terminate,
  },
  [until]: {
    connectorId: controlConnectorId,
    operationId: until,
  },
  [integrationaccountartifactlookup]: {
    connectorId: 'connectionProviders/integrationAccountOperations',
    operationId: 'integrationAccountArtifactLookup',
  },
  [rosettanetencode]: {
    connectorId: rosettanetConnectorId,
    operationId: 'rosettaNetEncode',
  },
  [rosettanetdecode]: {
    connectorId: rosettanetConnectorId,
    operationId: 'rosettaNetDecode',
  },
  [rosettanetwaitforresponse]: {
    connectorId: rosettanetConnectorId,
    operationId: 'rosettaNetWaitForResponse',
  },
  [xslttransform]: {
    connectorId: 'connectionProviders/dataMapperOperations',
    operationId: 'xsltTransform',
  },
  [x12decode]: {
    connectorId: x12ConnectorId,
    operationId: x12decode,
  },
  [x12encode]: {
    connectorId: x12ConnectorId,
    operationId: x12encode,
  },
  [x12batchencode]: {
    connectorId: x12ConnectorId,
    operationId: x12batchencode,
  },
  [edifactdecode]: {
    connectorId: edifactConnectorId,
    operationId: edifactdecode,
  },
  [edifactencode]: {
    connectorId: edifactConnectorId,
    operationId: edifactencode,
  },
  [edifactbatchencode]: {
    connectorId: edifactConnectorId,
    operationId: edifactbatchencode,
  },
  [chunktext]: {
    connectorId: dataOperationConnectorId,
    operationId: chunktext,
  },
  [parsedocument]: {
    connectorId: dataOperationConnectorId,
    operationId: parsedocument,
  },
  [parsedocumentwithmetadata]: {
    connectorId: dataOperationConnectorId,
    operationId: parsedocumentwithmetadata,
  },
  [chunktextwithmetadata]: {
    connectorId: dataOperationConnectorId,
    operationId: chunktextwithmetadata,
  },
};

export const supportedBaseManifestObjects = new Map<string, OperationManifest>([
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
  [httpaction, httpManifest],
  [httptrigger, httpTriggerManifest],
  [httpswaggeraction, httpWithSwaggerManifest],
  [httpswaggertrigger, httpWithSwaggerTriggerManifest],
  [httpwebhookaction, httpWebhookManifest],
  [httpwebhooktrigger, httpWebhookTriggerManifest],
  [incrementvariable, incrementManifest],
  [initializevariable, initializeManifest],
  [join, joinManifest],
  [parsejson, parsejsonManifest],
  [query, queryManifest],
  [recurrence, recurrenceManifest],
  [request, requestManifest],
  [a2arequest, a2aRequestManifest],
  [response, responseManifest],
  [scope, scopeManifest],
  [select, selectManifest],
  [setvariable, setManifest],
  [slidingwindow, slidingWindowManifest],
  [subtractfromtime, subtractFromTimeManifest],
  [switchType, switchManifest],
  [agentType, agentloopManifest],
  [handoff, handoffManifest],
  [terminate, terminateManifest],
  [until, untilManifest],
]);

export const foreachOperationInfo = {
  type: foreach,
  connectorId: controlConnectorId,
  operationId: foreach,
};
