/**
 * https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2015-08-01-preview/workflowdefinition.json#
 */
import type * as LogicAppsV2 from './logicAppsV2';

/* Content and Schema actions common types */

export interface ContentAndSchemaInputs {
  content: string;
  integrationAccount: IntegrationAccountSchemaInformation;
}

export interface IntegrationAccountSchemaInformation {
  schema: ArtifactInformation;
}

export interface ArtifactInformation {
  name: string;
}

/* XML Validation action types */

export interface XmlValidationAction extends LogicAppsV2.Action {
  inputs: ContentAndSchemaInputs;
}

/* Flat file encoding action types */

export interface FlatFileEncodingAction extends LogicAppsV2.Action {
  inputs: FlatFileEncodingInputs;
}

export interface FlatFileEncodingInputs extends ContentAndSchemaInputs {
  emptyNodeGenerationMode?: EmptyNodeGenerationMode;
}

export const EmptyNodeGenerationMode = {
  ForcedDisabled: 'ForcedDisabled',
  HonorSchemaNodeProperty: 'HonorSchemaNodeProperty',
  ForcedEnabled: 'ForcedEnabled',
};
export type EmptyNodeGenerationMode = (typeof EmptyNodeGenerationMode)[keyof typeof EmptyNodeGenerationMode];
/* Flat file decoding action types */

export interface FlatFileDecodingAction extends LogicAppsV2.Action {
  inputs: ContentAndSchemaInputs;
}

/* Integration account artifact lookup action types */

export interface IntegrationAccountArtifactLookupInputs {
  artifactType: string;
  artifactName: string;
}

export interface IntegrationAccountArtifactLookupAction extends LogicAppsV2.Action {
  inputs: IntegrationAccountArtifactLookupInputs;
}

/* XSL transform action types */

export interface IntegrationAccountMapInformation {
  map: ArtifactInformation;
}

export interface XsltInputs {
  function?: FunctionInput;
  content: string;
  integrationAccount: IntegrationAccountMapInformation;
}

export interface XsltAction extends LogicAppsV2.Action {
  inputs: XsltInputs;
}

export interface FunctionInput {
  id: string;
}

/* Liquid action */
export interface LiquidAction extends LogicAppsV2.Action {
  inputs: LiquidActionInputs;
  kind: string;
}

export interface LiquidActionInputs extends LogicAppsV2.RetryableActionInputs {
  content: any;
  transformedContentSchema?: any;
  integrationAccount: IntegrationAccountMapInformation;
}
