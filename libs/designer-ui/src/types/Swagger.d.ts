declare namespace Swagger {
  interface Swagger {
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

  interface Info {
    title: string;
    description?: string;
    termsOfService?: string;
    contact?: Contact;
    license?: License;
    version: string;
    [xdash: string]: any;
  }

  interface Contact {
    name?: string;
    url?: string;
    email?: string;
    [xdash: string]: any;
  }

  interface License {
    name: string;
    url?: string;
    [xdash: string]: any;
  }

  interface Paths {
    [path_or_xdash: string]: PathItem | any;
  }

  interface PathItem {
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

  type ParameterOrReference = Parameter | Reference;

  interface Operation {
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

  interface ExternalDocumentation {
    url: string;
    description?: string;
    [xdash: string]: any;
  }

  type Parameter = BodyParameter | NonBodyParameter;

  interface ParameterBase {
    name: string;
    in: string;
    required?: boolean;
    description?: string;
    [xdash: string]: any;
  }

  interface BodyParameter extends ParameterBase {
    schema: Schema;
  }

  interface NonBodyParameter extends ParameterBase {
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

  interface Items {
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

  interface Responses {
    default?: ResponseOrReference;
    [response_or_xdash: string]: ResponseOrReference | any;
  }

  type ResponseOrReference = Response | Reference;

  interface Response {
    description: string;
    schema?: Schema;
    headers?: Headers;
    examples?: Example;
    [xdash: string]: any;
  }

  interface Headers {
    [key: string]: Header;
  }

  interface Example {
    [mimeType: string]: any;
  }

  interface Header {
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

  interface Tag {
    name: string;
    description?: string;
    externalDocs?: ExternalDocumentation;
    [xdash: string]: any;
  }

  interface Reference {
    $ref: string;
  }

  interface Schema {
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
    items?: Schema;
    allOf?: Schema[];
    properties?: Record<string, Schema>;
    additionalProperties?: boolean | Schema;
    discriminator?: string;
    readOnly?: boolean;
    xml?: Xml;
    externalDocs?: ExternalDocumentation;
    example?: any;
    [xdash: string]: any;
  }

  interface Xml {
    name?: string;
    namespace?: string;
    prefix?: string;
    attribute?: boolean;
    wrapped?: boolean;
    [xdash: string]: any;
  }

  interface Definitions {
    [name: string]: Schema;
  }

  interface ParametersDefinitions {
    [name: string]: Parameter;
  }

  interface ResponsesDefinitions {
    [name: string]: Response;
  }

  interface SecurityDefinitions {
    [name: string]:
      | ApiKeySecurityScheme
      | OAuth2AccessCodeSecurityScheme
      | OAuth2ApplicationSecurityScheme
      | OAuth2ImplicitSecurityScheme
      | OAuth2PasswordSecurityScheme
      | SecurityScheme;
  }

  interface SecurityScheme {
    description?: string;
    type: string;
    [xdash: string]: any;
  }

  interface ApiKeySecurityScheme extends SecurityScheme {
    in: string;
    name: string;
  }

  interface OAuth2SecurityScheme extends SecurityScheme {
    flow: string;
    scopes: Scopes;
  }

  interface OAuth2AccessCodeSecurityScheme extends OAuth2SecurityScheme {
    authorizationUrl: string;
    tokenUrl: string;
  }

  interface OAuth2ApplicationSecurityScheme extends OAuth2SecurityScheme {
    tokenUrl: string;
  }

  interface OAuth2ImplicitSecurityScheme extends OAuth2SecurityScheme {
    authorizationUrl: string;
  }

  interface OAuth2PasswordSecurityScheme extends OAuth2SecurityScheme {
    tokenUrl: string;
  }

  interface Scopes {
    [name_or_xdash: string]: any;
  }

  interface SecurityRequirement {
    [name: string]: string[];
  }
}
