import { BaseOperationManifestService } from '../base';
import { getBuiltInOperationInfo, isBuiltInOperation, supportedBaseManifestObjects } from '../base/operationmanifest';
// import { equals, ConnectionType } from '@microsoft/utils-logic-apps';
import { composeManifest } from './manifests/compose';
import { flatFileDecodingManifest, flatFileEncodingManifest } from './manifests/flatfile';
import { inlineCodeManifest } from './manifests/inlinecode';
import { integrationAccountArtifactLookupManifest } from './manifests/integrationaccountartifactlookup';
import { liquidJsonToJsonManifest, liquidJsonToTextManifest, liquidXmlToJsonManifest, liquidXmlToTextManifest } from './manifests/liquid';
import { xmlTransformManifest, xmlValidationManifest } from './manifests/xml';
import type { OperationInfo, OperationManifest } from '@microsoft/utils-logic-apps';
import { isCustomConnector } from '@microsoft/utils-logic-apps';

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

  override async getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest> {
    if (isCustomConnector(connectorId)) return await this.getCustomOperationManifest(connectorId, operationId);

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
]);
