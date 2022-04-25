declare namespace OpenAPIV2 {
  interface Document {
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
      'x-express-openapi-additional-middleware'?: (((request: any, response: any, next: any) => Promise<void>) | ((request: any, response: any, next: any) => void))[];
      'x-express-openapi-validation-strict'?: boolean;
  }
  interface TagObject {
      name: string;
      description?: string;
      externalDocs?: ExternalDocumentationObject;
  }
  interface SecuritySchemeObjectBase {
      type: 'basic' | 'apiKey' | 'oauth2';
      description?: string;
  }
  interface SecuritySchemeBasic extends SecuritySchemeObjectBase {
      type: 'basic';
  }
  interface SecuritySchemeApiKey extends SecuritySchemeObjectBase {
      type: 'apiKey';
      name: string;
      in: string;
  }
  type SecuritySchemeOauth2 = SecuritySchemeOauth2Implicit | SecuritySchemeOauth2AccessCode | SecuritySchemeOauth2Password | SecuritySchemeOauth2Application;
  interface ScopesObject {
      [index: string]: any;
  }
  interface SecuritySchemeOauth2Base extends SecuritySchemeObjectBase {
      type: 'oauth2';
      flow: 'implicit' | 'password' | 'application' | 'accessCode';
      scopes: ScopesObject;
  }
  interface SecuritySchemeOauth2Implicit extends SecuritySchemeOauth2Base {
      flow: 'implicit';
      authorizationUrl: string;
  }
  interface SecuritySchemeOauth2AccessCode extends SecuritySchemeOauth2Base {
      flow: 'accessCode';
      authorizationUrl: string;
      tokenUrl: string;
  }
  interface SecuritySchemeOauth2Password extends SecuritySchemeOauth2Base {
      flow: 'password';
      tokenUrl: string;
  }
  interface SecuritySchemeOauth2Application extends SecuritySchemeOauth2Base {
      flow: 'application';
      tokenUrl: string;
  }
  type SecuritySchemeObject = SecuritySchemeBasic | SecuritySchemeApiKey | SecuritySchemeOauth2;
  interface SecurityDefinitionsObject {
      [index: string]: SecuritySchemeObject;
  }
  interface SecurityRequirementObject {
      [index: string]: string[];
  }
  interface ReferenceObject {
      $ref: string;
  }
  type Response = ResponseObject | ReferenceObject;
  interface ResponsesDefinitionsObject {
      [index: string]: ResponseObject;
  }
  type Schema = SchemaObject | ReferenceObject;
  interface ResponseObject {
      description: string;
      schema?: Schema;
      headers?: HeadersObject;
      examples?: ExampleObject;
  }
  interface HeadersObject {
      [index: string]: HeaderObject;
  }
  interface HeaderObject extends ItemsObject {
  }
  interface ExampleObject {
      [index: string]: any;
  }
  interface ResponseObject {
      description: string;
      schema?: Schema;
      headers?: HeadersObject;
      examples?: ExampleObject;
  }
  interface OperationObject {
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
  interface ResponsesObject {
      [index: string]: Response | any;
      default?: Response;
  }
  type Parameters = (ReferenceObject | Parameter)[];
  type Parameter = InBodyParameterObject | GeneralParameterObject;
  interface InBodyParameterObject extends ParameterObject {
      schema: Schema;
  }
  interface GeneralParameterObject extends ParameterObject, ItemsObject {
      allowEmptyValue?: boolean;
  }
  interface PathItemObject {
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
  interface PathsObject {
      [index: string]: PathItemObject | any;
  }
  interface ParametersDefinitionsObject {
      [index: string]: ParameterObject;
  }
  interface ParameterObject {
      name: string;
      in: string;
      description?: string;
      required?: boolean;
      [index: string]: any;
  }
  type MimeTypes = string[];
  interface DefinitionsObject {
      [index: string]: SchemaObject;
  }
  interface SchemaObject extends IJsonSchema {
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
  interface ExternalDocumentationObject {
      [index: string]: any;
      description?: string;
      url: string;
  }
  interface ItemsObject {
      type?: string;
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
  interface XMLObject {
      [index: string]: any;
      name?: string;
      namespace?: string;
      prefix?: string;
      attribute?: boolean;
      wrapped?: boolean;
  }
  interface InfoObject {
      title: string;
      description?: string;
      termsOfService?: string;
      contact?: ContactObject;
      license?: LicenseObject;
      version: string;
  }
  interface ContactObject {
      name?: string;
      url?: string;
      email?: string;
  }
  interface LicenseObject {
      name: string;
      url?: string;
  }

  interface IJsonSchema {
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
}
