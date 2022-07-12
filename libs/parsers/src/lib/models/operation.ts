import type { DownloadChunkMetadata, UploadChunkMetadata } from '@microsoft-logic-apps/utils';

export interface EnumObject {
  displayName: string;
  value: any;
}

export interface ResolvedParameter extends InputParameter {
  isUnknown?: boolean; // Whether the parameter is an unknown parameter (inferred to be 'any' type) sourced from the workflow definition
}

export interface InputParameter extends ParameterBase {
  in?: string;
  value?: any;
  // This defines a complex type for the object supported by the editors.
  schema?: any;
  suppressCasting?: boolean;
  hideInUI?: boolean;
  alternativeKey?: string;
}

export interface Annotation {
  status: string | undefined;
}

export interface Operation {
  operationId: string;
  description: string | undefined;
  method: string;
  path: string;
  summary: string | undefined;
  triggerType?: string;
  triggerHint?: string;
  visibility: string;
  annotation?: Annotation;
  operationHeadersExtension?: HeadersExtension;
  supportsPaging?: boolean;
  externalDocs?: OpenAPIV2.ExternalDocumentationObject;
  uploadChunkMetadata?: UploadChunkMetadata;
  downloadChunkMetadata?: DownloadChunkMetadata;
}

export type DynamicParameters = Record<string, DynamicParameter>;

export interface DynamicParameter {
  parameterReference: string;
  required: boolean;
}

export enum DynamicValuesType {
  NotSpecified,
  LegacyDynamicValues,
  DynamicList,
  DynamicTree,
}

export function isLegacyDynamicValuesExtension(extension: ParameterDynamicValues): extension is LegacyDynamicValues {
  return extension.type === DynamicValuesType.LegacyDynamicValues;
}

export function isDynamicListExtension(extension: ParameterDynamicValues): extension is DynamicList {
  return extension.type === DynamicValuesType.DynamicList;
}

export function isDynamicTreeExtension(extension: ParameterDynamicValues): extension is DynamicTree {
  return extension.type === DynamicValuesType.DynamicTree;
}

export interface LegacyDynamicValuesExtension {
  capability?: string;
  builtInOperation?: string;
  operationId?: string;
  parameters: Record<string, any | { parameter: any }>;
  'value-path': string;
  'value-collection'?: string;
  'value-title'?: string;
  'value-description'?: string;
  'value-selectable'?: string;
}

export interface LegacyDynamicValues {
  type: DynamicValuesType;
  extension: LegacyDynamicValuesExtension;
}

export interface DynamicListExtension {
  parameters: DynamicParameters;
  dynamicState: any;
}

export interface DynamicList {
  type: DynamicValuesType;
  extension: DynamicListExtension;
}

export interface DynamicTreeExtension {
  settings: {
    canSelectParentNodes: boolean;
    canSelectLeafNodes: boolean;
  };
  open: {
    parameters: DynamicParameters;
  };
  browse: {
    parameters: DynamicParameters;
  };
  dynamicState: any;
}

export interface DynamicTree {
  type: DynamicValuesType;
  extension: DynamicTreeExtension;
}

export type ParameterDynamicValues = LegacyDynamicValues | DynamicTree | DynamicList;

export enum DynamicSchemaType {
  NotSpecified,
  LegacyDynamicSchema,
  DynamicProperties,
}

export function isDynamicSchemaExtension(extension: ParameterDynamicSchema): extension is LegacyDynamicSchema {
  return extension.type === DynamicSchemaType.LegacyDynamicSchema;
}

export function isDynamicPropertiesExtension(extension: ParameterDynamicSchema): extension is DynamicProperties {
  return extension.type === DynamicSchemaType.DynamicProperties;
}

export interface LegacyDynamicSchemaExtension {
  operationId: string;
  parameters: Record<string, any | { parameter: any }>;
  'value-path': string;
}

export interface LegacyDynamicSchema {
  type: DynamicSchemaType;
  extension: LegacyDynamicSchemaExtension;
}

export interface DynamicPropertiesExtension {
  parameters: DynamicParameters;
  dynamicState: any;
}

export interface DynamicProperties {
  type: DynamicSchemaType;
  extension: DynamicPropertiesExtension;
}

export type ParameterDynamicSchema = LegacyDynamicSchema | DynamicProperties;

export interface ParameterSerializationOptions {
  skip?: boolean;
  location?: string[];
}

export interface ParameterBase {
  key: string;
  name: string;
  type: string;
  default?: any;
  description?: string;
  dynamicSchema?: ParameterDynamicSchema;
  dynamicValues?: ParameterDynamicValues;
  editor?: string;
  editorOptions?: Record<string, any>;
  encode?: string;
  enum?: EnumObject[];
  format?: string;
  alias?: string;
  isDynamic?: boolean;
  itemSchema?: any;
  isNested?: boolean;
  isNotificationUrl?: boolean;
  permission?: string;
  readOnly?: boolean;
  recommended?: any;
  required?: boolean;
  serialization?: ParameterSerializationOptions;
  summary?: string;
  title?: string;
  visibility?: string;
  groupName?: string;
}

export interface SchemaProperty extends ParameterBase {
  isInsideArray?: boolean;
  parentArray?: string;
  schema?: OpenAPIV2.SchemaObject;
  source?: string;
  contentHint?: string;
  dynamicallyAdded?: boolean;
}

export type OutputParameter = SchemaProperty;

export interface OutputMetadata {
  array?: {
    collectionPath: string;
    required: boolean;
  };
}

export type OutputParameters = Record<string, OutputParameter>;

export interface HeadersExtension {
  name: string;
  summary?: string;
  description?: string;
}

export interface InputParameters {
  byId: Record<string, InputParameter>;
  byName: Record<string, InputParameter>;
}

export type Operations = Record<string, Operation>;

export enum OperationInputType {
  NOTSPECIFIED,
  HEADERS,
}

/**
 * Convert from a SchemaProperty object to an InputParameter object.
 * @arg {SchemaProperty} schemaProperty
 * @arg {boolean} [suppressCasting = false]
 * @return {InputParameter}
 */
export function toInputParameter(schemaProperty: SchemaProperty, suppressCasting = false): InputParameter {
  const {
    alias,
    default: $default,
    description,
    dynamicSchema,
    dynamicValues,
    editor,
    editorOptions,
    encode,
    enum: $enum,
    format,
    isDynamic,
    isNested,
    isNotificationUrl,
    itemSchema,
    key,
    name,
    permission,
    readOnly,
    recommended,
    required,
    schema,
    serialization,
    summary,
    title,
    type,
    visibility,
  } = schemaProperty;

  return {
    alias,
    default: $default,
    description,
    dynamicSchema,
    dynamicValues,
    editor,
    editorOptions,
    encode,
    enum: $enum,
    format,
    isDynamic,
    isNested,
    isNotificationUrl,
    itemSchema,
    key,
    name,
    permission,
    readOnly,
    recommended,
    required,
    schema,
    serialization,
    summary,
    suppressCasting,
    title,
    type,
    visibility,
  };
}
