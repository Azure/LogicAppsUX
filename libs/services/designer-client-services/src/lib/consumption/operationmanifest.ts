import { BaseOperationManifestService } from '../base';
import {
  getBuiltInOperationInfo,
  isBuiltInOperation,
  supportedBaseManifestObjects,
  supportedBaseManifestTypes,
} from '../base/operationmanifest';
import { selectApiManagementActionManifest } from './manifests/apiManagement';
import { selectAppServiceActionManifest } from './manifests/appServices';
import { selectBatchWorkflowManifest } from './manifests/batchWorkflow';
import { composeManifest } from './manifests/compose';
import { flatFileDecodingManifest, flatFileEncodingManifest } from './manifests/flatfile';
import { selectFunctionManifest } from './manifests/functions';
import { inlineCodeManifest } from './manifests/inlinecode';
import { integrationAccountArtifactLookupManifest } from './manifests/integrationaccountartifactlookup';
import { liquidJsonToJsonManifest, liquidJsonToTextManifest, liquidXmlToJsonManifest, liquidXmlToTextManifest } from './manifests/liquid';
import { selectManualWorkflowManifest } from './manifests/manualWorkflow';
import { xmlTransformManifest, xmlValidationManifest } from './manifests/xml';
import type { OperationInfo, OperationManifest } from '@microsoft/utils-logic-apps';

export class ConsumptionOperationManifestService extends BaseOperationManifestService {
  override async getOperationInfo(definition: any, isTrigger: boolean): Promise<OperationInfo> {
    if (isBuiltInOperation(definition)) {
      return getBuiltInOperationInfo(definition, isTrigger);
    }

    return {
      connectorId: 'Unknown',
      operationId: 'Unknown',
    };

    //throw new UnsupportedException(`Operation type: ${definition.type} does not support manifest.`);
  }

  override isSupported(operationType: string, _operationKind?: string): boolean {
    const { supportedTypes } = this.options;
    const normalizedOperationType = operationType.toLowerCase();
    return supportedTypes
      ? supportedTypes.indexOf(normalizedOperationType) > -1
      : supportedConsumptionManifestTypes.indexOf(normalizedOperationType) > -1;
  }

  override async getOperationManifest(_connectorId: string, operationId: string): Promise<OperationManifest> {
    const supportedManifest = supportedConsumptionManifestObjects.get(operationId);
    return supportedManifest ?? ({ properties: {} } as any);
  }
}

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
const azurefunction = 'function';
const appservice = 'appservice';
const workflow = 'workflow';
const sendtobatch = 'sendtobatch';

const supportedConsumptionManifestTypes = [...supportedBaseManifestTypes, apimanagement, azurefunction, appservice, workflow, sendtobatch];

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
  [apimanagement, selectApiManagementActionManifest],
  // [selectApiManagementTrigger, selectApiManagementTriggerManifest],
  [appservice, selectAppServiceActionManifest],
  // [selectAppServiceTrigger, selectAppServiceTriggerManifest],
  ['azurefunction', selectFunctionManifest],
  ['invokeworkflow', selectManualWorkflowManifest],
  [sendtobatch, selectBatchWorkflowManifest],
]);
