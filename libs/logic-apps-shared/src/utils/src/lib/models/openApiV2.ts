export interface Document {
  basePath?: string;
  consumes?: MimeTypes;
  definitions?: DefinitionsObject;
  externalDocs?: ExternalDocumentationObject;
  host?: string;
  info: InfoObject;
  parameters?: ParametersDefinitionsObject;
  paths: PathsObject;
  produces?: MimeTypes;
  responses?: ResponsesDefinitionsObject;
  schemes?: string[];
  security?: SecurityRequirementObject[];
  securityDefinitions?: SecurityDefinitionsObject;
  swagger: string;
  tags?: TagObject[];
  'x-express-openapi-additional-middleware'?: (
    | ((request: any, response: any, next: any) => Promise<void>)
    | ((request: any, response: any, next: any) => void)
  )[];
  'x-express-openapi-validation-strict'?: boolean;
  'x-ms-capabilities'?: any;
}

export interface TagObject {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
}

export interface SecuritySchemeObjectBase {
  type: 'basic' | 'apiKey' | 'oauth2';
  description?: string;
}

export interface SecuritySchemeBasic extends SecuritySchemeObjectBase {
  type: 'basic';
}

export interface SecuritySchemeApiKey extends SecuritySchemeObjectBase {
  type: 'apiKey';
  name: string;
  in: string;
}

export type SecuritySchemeOauth2 =
  | SecuritySchemeOauth2Implicit
  | SecuritySchemeOauth2AccessCode
  | SecuritySchemeOauth2Password
  | SecuritySchemeOauth2Application;

export interface ScopesObject {
  [index: string]: any;
}

export interface SecuritySchemeOauth2Base extends SecuritySchemeObjectBase {
  type: 'oauth2';
  flow: 'implicit' | 'password' | 'application' | 'accessCode';
  scopes: ScopesObject;
}

export interface SecuritySchemeOauth2Implicit extends SecuritySchemeOauth2Base {
  flow: 'implicit';
  authorizationUrl: string;
}

export interface SecuritySchemeOauth2AccessCode extends SecuritySchemeOauth2Base {
  flow: 'accessCode';
  authorizationUrl: string;
  tokenUrl: string;
}

export interface SecuritySchemeOauth2Password extends SecuritySchemeOauth2Base {
  flow: 'password';
  tokenUrl: string;
}

export interface SecuritySchemeOauth2Application extends SecuritySchemeOauth2Base {
  flow: 'application';
  tokenUrl: string;
}

export type SecuritySchemeObject = SecuritySchemeBasic | SecuritySchemeApiKey | SecuritySchemeOauth2;

export interface SecurityDefinitionsObject {
  [index: string]: SecuritySchemeObject;
}

export interface SecurityRequirementObject {
  [index: string]: string[];
}

export interface ReferenceObject {
  $ref: string;
}

export type Response = ResponseObject | ReferenceObject;

export interface ResponsesDefinitionsObject {
  [index: string]: ResponseObject;
}

export type Schema = SchemaObject | ReferenceObject;

export interface ResponseObject {
  description: string;
  schema?: Schema;
  headers?: HeadersObject;
  examples?: ExampleObject;
}

export interface HeadersObject {
  [index: string]: HeaderObject;
}

export type HeaderObject = ItemsObject;

export interface ExampleObject {
  [index: string]: any;
}

export interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  consumes?: MimeTypes;
  produces?: MimeTypes;
  parameters?: Parameters;
  responses: ResponsesObject;
  schemes?: string[];
  deprecated?: boolean;
  security?: SecurityRequirementObject[];
  [index: string]: any;
}

export interface ResponsesObject {
  [index: string]: Response | any;
  default?: Response;
}

export type Parameters = (ReferenceObject | Parameter)[];

export type Parameter = InBodyParameterObject | GeneralParameterObject;

export interface InBodyParameterObject extends ParameterObject {
  schema: Schema;
}

export interface GeneralParameterObject extends ParameterObject, ItemsObject {
  allowEmptyValue?: boolean;
}

export interface PathItemObject {
  $ref?: string;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  del?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  patch?: OperationObject;
  parameters?: Parameters;
}

export interface PathsObject {
  [index: string]: PathItemObject | any;
}

export interface ParametersDefinitionsObject {
  [index: string]: ParameterObject;
}

export interface ParameterObject {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  [index: string]: any;
}

export type MimeTypes = string[];

export interface DefinitionsObject {
  [index: string]: SchemaObject;
}

export interface SchemaObject extends IJsonSchema {
  [index: string]: any;
  discriminator?: string;
  readOnly?: boolean;
  xml?: XMLObject;
  externalDocs?: ExternalDocumentationObject;
  example?: any;
  default?: any;
  items?: SchemaObject;
  allOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  properties?: {
    [name: string]: SchemaObject;
  };
}

export interface ExternalDocumentationObject {
  [index: string]: any;
  description?: string;
  url: string;
}

export interface ItemsObject {
  type?: string | string[];
  format?: string;
  items?: ItemsObject;
  collectionFormat?: string;
  default?: any;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  enum?: any[];
  multipleOf?: number;
  $ref?: string;
  properties?: {
    [name: string]: IJsonSchema;
  };
}

export interface XMLObject {
  [index: string]: any;
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

export interface InfoObject {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
  version: string;
  [index: string]: any;
}

export interface ContactObject {
  name?: string;
  url?: string;
  email?: string;
}

export interface LicenseObject {
  name: string;
  url?: string;
}

export interface IJsonSchema {
  id?: string;
  $schema?: string;
  title?: string;
  description?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  additionalItems?: boolean | IJsonSchema;
  items?: IJsonSchema | IJsonSchema[];
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  additionalProperties?: boolean | IJsonSchema;
  definitions?: {
    [name: string]: IJsonSchema;
  };
  properties?: {
    [name: string]: IJsonSchema;
  };
  patternProperties?: {
    [name: string]: IJsonSchema;
  };
  dependencies?: {
    [name: string]: IJsonSchema | string[];
  };
  enum?: any[];
  type?: string | string[];
  format?: string;
  allOf?: IJsonSchema[];
  anyOf?: IJsonSchema[];
  oneOf?: IJsonSchema[];
  not?: IJsonSchema;
}
