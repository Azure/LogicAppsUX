/**
 * https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2015-08-01-preview/workflowdefinition.json#
 */
import type * as LogicApps from './logicApps';

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

export interface XmlValidationAction extends LogicApps.Action {
  inputs: ContentAndSchemaInputs;
}

/* Flat file encoding action types */

export interface FlatFileEncodingAction extends LogicApps.Action {
  inputs: FlatFileEncodingInputs;
}

export interface FlatFileEncodingInputs extends ContentAndSchemaInputs {
  emptyNodeGenerationMode?: EmptyNodeGenerationMode;
}

const enum EmptyNodeGenerationMode {
  ForcedDisabled,
  HonorSchemaNodeProperty,
  ForcedEnabled,
}

/* Flat file decoding action types */

export interface FlatFileDecodingAction extends LogicApps.Action {
  inputs: ContentAndSchemaInputs;
}

/* Integration account artifact lookup action types */

export interface IntegrationAccountArtifactLookupInputs {
  artifactType: string;
  artifactName: string;
}

export interface IntegrationAccountArtifactLookupAction extends LogicApps.Action {
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
  xsltParameters?: Record<string, string>;
  transformOptions?: string;
}

export interface XsltAction extends LogicApps.Action {
  inputs: XsltInputs;
}

export interface FunctionInput {
  id: string;
}
