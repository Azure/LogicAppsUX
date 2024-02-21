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
import { as2EncodeManifest, as2DecodeManifest } from './manifests/as2';
import { batchTriggerManifest, sendToBatchManifest } from './manifests/batchWorkflow';
import { composeManifest } from './manifests/compose';
import { flatFileDecodingManifest, flatFileEncodingManifest } from './manifests/flatfile';
import { selectFunctionManifest } from './manifests/functions';
import { inlineCodeManifest } from './manifests/inlinecode';
import { integrationAccountArtifactLookupManifest } from './manifests/integrationaccountartifactlookup';
import { invokeWorkflowManifest } from './manifests/invokeWorkflow';
import { liquidJsonToJsonManifest, liquidJsonToTextManifest, liquidXmlToJsonManifest, liquidXmlToTextManifest } from './manifests/liquid';
import { rosettaNetEncodeManifest, rosettaNetDecodeManifest, rosettaNetWaitForResponseManifest } from './manifests/rosettanet';
import { selectSwaggerFunctionManifest } from './manifests/swaggerFunctions';
import { xmlTransformManifest, xmlValidationManifest } from './manifests/xml';
import { functionGroup, functionOperation, invokeWorkflowGroup, invokeWorkflowOperation, swaggerFunctionOperation } from './operations';
import type { OperationInfo, OperationManifest } from '@microsoft/logic-apps-shared';
import { ArgumentException, UnsupportedException, startsWith } from '@microsoft/logic-apps-shared';

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

  override isSupported(operationType?: string, _operationKind?: string): boolean {
    const { supportedTypes } = this.options;
    const normalizedOperationType = operationType?.toLowerCase() ?? '';
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
      const response = await httpClient.get<any>({
        uri: `${baseUrl}${connectorId}/apiOperations/${operationName}`,
        queryParameters,
      });

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
const openapiconnectionwebhook = 'openapiconnectionwebhook';
const openapiconnectionnotification = 'openapiconnectionnotification';
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
const as2encode = 'as2encode';
const as2decode = 'as2decode';
const rosettanetencode = 'rosettanetencode';
const rosettanetdecode = 'rosettanetdecode';
const rosettanetwaitforresponse = 'rosettanetwaitforresponse';

// Azure Resource Connectors
const apimanagement = 'apimanagement';
const apimanagementtrigger = 'apimanagementtrigger';
const appservice = 'appservice';
const appservicetrigger = 'appservicetrigger';
const invokeworkflow = 'invokeworkflow';
const sendtobatch = 'sendtobatch';
const batch = 'batch';

const supportedConsumptionManifestTypes = [
  ...supportedBaseManifestTypes,
  appservice,
  openapiconnection,
  openapiconnectionwebhook,
  openapiconnectionnotification,
];

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
  [as2encode, as2EncodeManifest],
  [as2decode, as2DecodeManifest],
  [rosettanetencode, rosettaNetEncodeManifest],
  [rosettanetdecode, rosettaNetDecodeManifest],
  [rosettanetwaitforresponse, rosettaNetWaitForResponseManifest],
]);
