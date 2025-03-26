import type {
  Expression,
  InputDependencies,
  ParameterDeserializationOptions,
  ParameterSerializationOptions,
  Exception,
  OpenAPIV2,
} from '@microsoft/logic-apps-shared';

export interface ParameterInfo {
  alternativeKey?: string;
  conditionalVisibility?: boolean;
  dynamicData?: {
    error?: Exception;
    status: DynamicLoadStatus;
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
  allowedCount?: number;
}

export interface ParameterDetails {
  alias?: string;
  arrayItemInputParameterKey?: string; // Note: the associated array item's input parameter key, which could be used as key in reference dynamic parameter
  dependencies?: InputDependencies;
  encode?: string;
  format?: string;
  collectionFormat?: string;
  in?: string;
  isDynamic?: boolean;
  dynamicParameterReference?: string;
  isEditorManagedItem?: boolean; // Note: Flag to indicate whether this parameter is managed by a specific editor
  isUnknown?: boolean; // Whether the parameter is an unknown parameter (inferred to be 'any' type) sourced from the workflow definition
  parentProperty?: any;
  serialization?: ParameterSerializationOptions;
  deserialization?: ParameterDeserializationOptions;
}

export const DynamicLoadStatus = {
  NOTSTARTED: 'notstarted',
  LOADING: 'loading',
  FAILED: 'failed',
  SUCCEEDED: 'succeeded',
} as const;
export type DynamicLoadStatus = (typeof DynamicLoadStatus)[keyof typeof DynamicLoadStatus];

export interface ValueSegment {
  id: string;
  type: ValueSegmentType;
  value: string;
  token?: Token;
}

export const ValueSegmentType = {
  LITERAL: 'literal',
  TOKEN: 'token',
} as const;
export type ValueSegmentType = (typeof ValueSegmentType)[keyof typeof ValueSegmentType];

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

export const TokenType = {
  FX: 'fx',
  ITEM: 'item',
  ITERATIONINDEX: 'iterationIndex',
  OUTPUTS: 'outputs',
  PARAMETER: 'parameter',
  VARIABLE: 'variable',
  AGENTPARAMETER: 'agentParameter',
} as const;
export type TokenType = (typeof TokenType)[keyof typeof TokenType];
