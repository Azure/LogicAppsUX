import { BaseOperationManifestService } from '../base';
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
import { xmlTransformManifest, xmlValidationManifest } from './manifests/xml';
import { invokeWorkflowGroup, invokeWorkflowOperation } from './operations';
import type { OperationInfo, OperationManifest } from '@microsoft/utils-logic-apps';
import { UnsupportedException } from '@microsoft/utils-logic-apps';

export class ConsumptionOperationManifestService extends BaseOperationManifestService {
  override async getOperationInfo(definition: any, isTrigger: boolean): Promise<OperationInfo> {
    if (isBuiltInOperation(definition)) {
      const normalizedOperationType = definition.type?.toLowerCase();

      switch (normalizedOperationType) {
        case 'workflow':
          return {
            connectorId: invokeWorkflowGroup.id,
            operationId: invokeWorkflowOperation.id,
          };

        default:
          return getBuiltInOperationInfo(definition, isTrigger);
      }
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

    if (!supportedManifest) {
      throw new UnsupportedException(`Operation manifest does not exist for connector: '${connectorId}' and operation: '${operationId}'`);
    }

    return supportedManifest;
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
const apimanagementtrigger = 'apimanagementtrigger';
const appservice = 'appservice';
const appservicetrigger = 'appservicetrigger';
const invokeworkflow = 'invokeworkflow';
const sendtobatch = 'sendtobatch';
const batch = 'batch';

const supportedConsumptionManifestTypes = [...supportedBaseManifestTypes, appservice];

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
  [invokeworkflow, invokeWorkflowManifest],
  [sendtobatch, sendToBatchManifest],
  [batch, batchTriggerManifest],
]);
