import type { DownloadChunkMetadata, OpenAPIV2, UploadChunkMetadata } from '../../../utils/src';
import { equals } from '../../../utils/src';

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

export interface LAOperation {
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
  parameterReference?: string;
  parameter?: string;
  required: boolean;
}

export const DynamicValuesType = {
  NotSpecified: 'NotSpecified',
  LegacyDynamicValues: 'LegacyDynamicValues',
  DynamicList: 'DynamicList',
  DynamicTree: 'DynamicTree',
};
export type DynamicValuesType = (typeof DynamicValuesType)[keyof typeof DynamicValuesType];

export function isLegacyDynamicValuesExtension(extension: ParameterDynamicValues): extension is LegacyDynamicValues {
  return extension.type === DynamicValuesType.LegacyDynamicValues;
}

export function isLegacyDynamicValuesTreeExtension(extension: ParameterDynamicValues): extension is LegacyDynamicValues {
  return isLegacyDynamicValuesExtension(extension) && equals(extension.extension.capability, 'file-picker');
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
  operationId: string;
  parameters: Record<string, any | { parameter: any }>;
  'value-path': string;
  'value-collection'?: string;
  'value-title'?: string;
  'value-description'?: string;
  'value-selectable'?: string;
}

export interface FilePickerInfo {
  open: DynamicTreePickerInfo;
  browse: DynamicTreePickerInfo;
  collectionPath?: string;
  valuePath?: string;
  titlePath?: string;
  fullTitlePath?: string;
  folderPropertyPath?: string;
  mediaPropertyPath?: string;
}

interface DynamicTreePickerInfo {
  operationId: string;
  parameters?: Record<
    string,
    {
      selectedItemValuePath?: string;
      'value-property'?: string;
    }
  >;
  itemValuePath?: string;
  itemTitlePath?: string;
  itemIsParent?: string;
  itemFullTitlePath?: string;
  selectableFilter?: string;
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
  open: DynamicTreePickerInfo;
  browse: DynamicTreePickerInfo;
  dynamicState: any;
}

export interface DynamicTree {
  type: DynamicValuesType;
  extension: DynamicTreeExtension;
}

export type ParameterDynamicValues = LegacyDynamicValues | DynamicTree | DynamicList;

export const DynamicSchemaType = {
  NotSpecified: 'NotSpecified',
  LegacyDynamicSchema: 'LegacyDynamicSchema',
  DynamicProperties: 'DynamicProperties',
};
export type DynamicSchemaType = (typeof DynamicSchemaType)[keyof typeof DynamicSchemaType];

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

export const DeserializationType = {
  ParentObjectProperties: 'parentobjectproperties',
  PathTemplateProperties: 'pathtemplateproperties',
  SwaggerOperationId: 'swaggeroperationid',
};
export type DeserializationType = (typeof DeserializationType)[keyof typeof DeserializationType];

export interface ParameterDeserializationOptions {
  type: DeserializationType;
  parameterReference?: string;
  options?: {
    swaggerOperation: {
      methodPath: string[];
      uriPath?: string[];
      templatePath?: string[];
    };
  };
}

export const PropertySerializationType = {
  ParentObject: 'parentobject',
  PathTemplate: 'pathtemplate',
  SwaggerUrl: 'swaggerurl',
};
export type PropertySerializationType = (typeof PropertySerializationType)[keyof typeof PropertySerializationType];

export interface ParameterSerializationOptions {
  skip?: boolean;
  location?: string[];
  value?: any;
  property?: {
    type: string;
    name?: string;
    parameterReference?: string;
  };
}

export interface DependentParameterInfo {
  name: string;
  values?: any[];
  excludeValues?: any[];
}
export interface InputDependencies {
  type: string;
  parameters: DependentParameterInfo[];
}

interface ParameterBase {
  key: string;
  name: string;
  type: string;
  default?: any;
  dependencies?: InputDependencies;
  description?: string;
  displayText?: string;
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
  deserialization?: ParameterDeserializationOptions;
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

export type Operations = Record<string, LAOperation>;

export const OperationInputType = {
  NOTSPECIFIED: 'NOTSPECIFIED',
  HEADERS: 'HEADERS',
};

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
    dependencies,
    description,
    displayText,
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
    deserialization,
    summary,
    title,
    type,
    visibility,
  } = schemaProperty;

  return {
    alias,
    default: $default,
    dependencies,
    description,
    displayText,
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
    deserialization,
    summary,
    suppressCasting,
    title,
    type,
    visibility,
  };
}
