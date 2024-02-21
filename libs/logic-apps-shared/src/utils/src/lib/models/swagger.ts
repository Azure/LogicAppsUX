export interface Swagger {
  swagger: string;
  info: Info;
  paths: Paths;
  host?: string;
  basePath?: string;
  schemes?: string[];
  consumes?: string[];
  produces?: string[];
  definitions?: Definitions;
  parameters?: ParametersDefinitions;
  responses?: ResponsesDefinitions;
  securityDefinitions?: SecurityDefinitions;
  security?: SecurityRequirement[];
  tags?: Tag[];
  externalDocs?: ExternalDocumentation;
  [xdash: string]: any;
}

export interface Info {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: Contact;
  license?: License;
  version: string;
  [xdash: string]: any;
}

export interface Contact {
  name?: string;
  url?: string;
  email?: string;
  [xdash: string]: any;
}

export interface License {
  name: string;
  url?: string;
  [xdash: string]: any;
}

export interface Paths {
  [path_or_xdash: string]: PathItem | any;
}

export interface PathItem {
  $ref?: string;
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  patch?: Operation;
  parameters?: ParameterOrReference[];
  [xdash: string]: any;
}

export type ParameterOrReference = Parameter | Reference;

export interface Operation {
  responses: Responses;
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentation;
  operationId?: string;
  consumes?: string[];
  produces?: string[];
  parameters?: ParameterOrReference[];
  schemes?: string[];
  deprecated?: boolean;
  security?: SecurityRequirement[];
  [xdash: string]: any;
}

export interface ExternalDocumentation {
  url: string;
  description?: string;
  [xdash: string]: any;
}

export type Parameter = BodyParameter | NonBodyParameter;

export interface ParameterBase {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  [xdash: string]: any;
}

export interface BodyParameter extends ParameterBase {
  schema: SwaggerSchema;
}

export interface NonBodyParameter extends ParameterBase {
  type: string;
  format?: string;
  allowEmptyValue?: boolean;
  items?: Items;
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
}

export interface Items {
  type: string;
  format?: string;
  items?: Items;
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
  [xdash: string]: any;
}

export interface Responses {
  default?: ResponseOrReference;
  [response_or_xdash: string]: ResponseOrReference | any;
}

export type ResponseOrReference = Response | Reference;

export interface Response {
  description: string;
  schema?: SwaggerSchema;
  headers?: Headers;
  examples?: Example;
  [xdash: string]: any;
}

export interface Headers {
  [key: string]: Header;
}

export interface Example {
  [mimeType: string]: any;
}

export interface Header {
  description?: string;
  type: string;
  format?: string;
  items?: Items;
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
  [xdash: string]: any;
}

export interface Tag {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentation;
  [xdash: string]: any;
}

export interface Reference {
  $ref: string;
}

export interface SwaggerSchema {
  $ref?: string;
  format?: string;
  title?: string;
  description?: string;
  default?: any;
  multipleOf?: number;
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
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
  type?: string; // Note: We might need to add support for string[] here later.
  items?: SwaggerSchema;
  allOf?: SwaggerSchema[];
  properties?: Record<string, SwaggerSchema>;
  additionalProperties?: boolean | SwaggerSchema;
  discriminator?: string;
  readOnly?: boolean;
  xml?: Xml;
  externalDocs?: ExternalDocumentation;
  example?: any;
  [xdash: string]: any;
}

export interface Xml {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
  [xdash: string]: any;
}

export interface Definitions {
  [name: string]: SwaggerSchema;
}

export interface ParametersDefinitions {
  [name: string]: Parameter;
}

export interface ResponsesDefinitions {
  [name: string]: Response;
}

export interface SecurityDefinitions {
  [name: string]:
    | ApiKeySecurityScheme
    | OAuth2AccessCodeSecurityScheme
    | OAuth2ApplicationSecurityScheme
    | OAuth2ImplicitSecurityScheme
    | OAuth2PasswordSecurityScheme
    | SecurityScheme;
}

export interface SecurityScheme {
  description?: string;
  type: string;
  [xdash: string]: any;
}

export interface ApiKeySecurityScheme extends SecurityScheme {
  in: string;
  name: string;
}

export interface OAuth2SecurityScheme extends SecurityScheme {
  flow: string;
  scopes: Scopes;
}

export interface OAuth2AccessCodeSecurityScheme extends OAuth2SecurityScheme {
  authorizationUrl: string;
  tokenUrl: string;
}

export interface OAuth2ApplicationSecurityScheme extends OAuth2SecurityScheme {
  tokenUrl: string;
}

export interface OAuth2ImplicitSecurityScheme extends OAuth2SecurityScheme {
  authorizationUrl: string;
}

export interface OAuth2PasswordSecurityScheme extends OAuth2SecurityScheme {
  tokenUrl: string;
}

export interface Scopes {
  [name_or_xdash: string]: any;
}

export interface SecurityRequirement {
  [name: string]: string[];
}
