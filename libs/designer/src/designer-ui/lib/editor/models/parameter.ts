import type {
  Expression,
  InputDependencies,
  ParameterDeserializationOptions,
  ParameterSerializationOptions,
 Exception, OpenAPIV2 } from '@microsoft/logic-apps-designer';

export interface ParameterInfo {
  alternativeKey?: string;
  conditionalVisibility?: boolean;
  dynamicData?: {
    error?: Exception;
    status: DynamicCallStatus;
  };
  editor?: string;
  editorOptions?: Record<string, any>;
  editorViewModel?: any;
  info: ParameterDetails;
  hideInUI?: boolean;
  id: string;
  label: string;
  parameterKey: string;
  parameterName: string;
  pattern?: string;
  placeholder?: string;
  preservedValue?: any;
  required: boolean;
  schema?: any;
  showErrors?: boolean;
  showTokens?: boolean;
  suppressCasting?: boolean;
  type: string;
  validationErrors?: string[];
  value: ValueSegment[];
  visibility?: string;
}

export interface ParameterDetails {
  alias?: string;
  arrayItemInputParameterKey?: string; // Note: the associated array item's input parameter key, which could be used as key in reference dynamic parameter
  dependencies?: InputDependencies;
  encode?: string;
  format?: string;
  in?: string;
  isDynamic?: boolean;
  isEditorManagedItem?: boolean; // Note: Flag to indicate whether this parameter is managed by a specific editor
  isUnknown?: boolean; // Whether the parameter is an unknown parameter (inferred to be 'any' type) sourced from the workflow definition
  parentProperty?: any;
  serialization?: ParameterSerializationOptions;
  deserialization?: ParameterDeserializationOptions;
}

export enum DynamicCallStatus {
  STARTED,
  SUCCEEDED,
  FAILED,
  NOTSTARTED,
}

export interface ValueSegment {
  id: string;
  type: ValueSegmentType;
  value: string;
  token?: Token;
}

export enum ValueSegmentType {
  LITERAL = 'literal',
  TOKEN = 'token',
}

export interface Token {
  actionName?: string;
  arrayDetails?: {
    loopSource?: string;
    parentArrayName?: string;
    parentArrayKey?: string;
    itemSchema?: OpenAPIV2.SchemaObject;
  };
  brandColor?: string;
  description?: string;
  expression?: Expression;
  format?: string;
  icon?: string;
  isSecure?: boolean;
  key: string;
  name?: string;
  required?: boolean;
  schema?: OpenAPIV2.SchemaObject;
  source?: string;
  title: string;
  tokenType: TokenType;
  type?: string;
  value?: string;
}

export enum TokenType {
  FX,
  ITEM,
  ITERATIONINDEX,
  OUTPUTS,
  PARAMETER,
  VARIABLE,
}
