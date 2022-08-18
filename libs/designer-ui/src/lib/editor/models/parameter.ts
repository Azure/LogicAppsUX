import type { Expression, ParameterSerializationOptions } from '@microsoft-logic-apps/parsers';
import type { Exception } from '@microsoft-logic-apps/utils';

export interface ParameterInfo {
  alternativeKey?: string;
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
  arrayItemInputParameterKey?: string; // NOTE(johnwa): the associated array item's input parameter key, which could be used as key in reference dynamic parameter
  encode?: string;
  format?: string;
  in?: string;
  isDynamic?: boolean;
  isEditorManagedItem?: boolean; // NOTE(johnwa): Flag to indicate whether this parameter is managed by a specific editor
  isUnknown?: boolean; // Whether the parameter is an unknown parameter (inferred to be 'any' type) sourced from the workflow definition
  parentProperty?: any;
  serialization?: ParameterSerializationOptions;
}

export enum DynamicCallStatus {
  STARTED,
  SUCCEEDED,
  FAILED,
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
