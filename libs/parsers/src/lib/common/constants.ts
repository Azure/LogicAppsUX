export const DefaultKeyPrefix = '$';

export const ExtensionProperties = {
  Alias: 'x-ms-property-name-alias',
  Annotation: 'x-ms-api-annotation',
  BasePath: 'x-ms-base-path',
  Capabilities: 'x-ms-capabilities',
  ContentHint: 'x-ms-content-hint',

  // used by DynamicsAX & SharePoint connectors to describe table metadata, in particular the order in which table columns should be displayed
  CustomEnum: 'x-ms-enum-values',
  DisplayFormat: 'x-ms-displayFormat',
  DynamicallyAdded: 'x-ms-dynamically-added',
  DynamicSchema: 'x-ms-dynamic-schema',
  DynamicList: 'x-ms-dynamic-list',
  DynamicTree: 'x-ms-dynamic-tree',
  DynamicProperties: 'x-ms-dynamic-properties',
  DynamicValues: 'x-ms-dynamic-values',
  Editor: 'x-ms-editor',
  EditorOptions: 'x-ms-editor-options',
  Encode: 'x-ms-url-encoding',
  Format: 'x-ms-format',
  Headers: 'x-ms-headers',
  Method: 'x-ms-method',
  Notification: 'x-ms-notification',
  NotificationContent: 'x-ms-notification-content',
  NotificationUrl: 'x-ms-notification-url',
  Path: 'x-ms-path',
  Permission: 'x-ms-permission',

  // used by DynamicsAX & SharePoint connectors to describe table metadata, in particular the dependencies between table columns
  Relationships: 'x-ms-relationships',
  SchedulerRecommendation: 'x-ms-scheduler-recommendation',
  SchedulerTrigger: 'x-ms-scheduler-trigger',
  Serialization: 'x-ms-serialization',
  Summary: 'x-ms-summary',
  SupportsPaging: 'x-ms-pageable',
  Trigger: 'x-ms-trigger',
  TriggerHint: 'x-ms-trigger-hint',
  Visibility: 'x-ms-visibility',
};

export const Formats = {
  ContentOnly: 'contentOnly',
};

export const Permissions = {
  ReadOnly: 'read-only',
  ReadWrite: 'read-write',
};

export const Capabilities = {
  ChunkTransfer: 'chunkTransfer',
  AcceptUploadChunkSize: 'acceptUploadChunkSizeInMB',
  MinimumUploadChunkSize: 'minimumUploadChunkSizeInMB',
  MaximumUploadChunkSize: 'maximumUploadChunkSizeInMB',
  AcceptDownloadChunkSize: 'acceptDownloadChunkSizeInMB',
  MinimumDownloadChunkSize: 'minimumDownloadChunkSizeInMB',
  MaximumDownloadChunkSize: 'maximumDownloadChunkSizeInMB',
};

export const PropertyName = {
  API: 'api',
  METHOD: 'method',
  RETRYPOLICY: 'retryPolicy',
  AUTHENTICATION: 'authentication',
  HEADERS: 'headers',
  BODY: 'body',
  QUERY: 'query',
  QUERIES: 'queries',
  PATH: 'path',
  PATHTEMPLATE: 'pathTemplate',
  PATHTEMPLATE_PARAMETERS: 'parameters',
  PATHTEMPLATE_TEMPLATE: 'template',
  HOST: 'host',
  URI: 'uri',
  PARAMETERS: 'parameters',
  CONTENT_DISPOSITION: 'Content-Disposition',
};

export const FILE_PARAMETER_KEYS = {
  CONTENT: 'contentBytes',
  FILENAME: 'name',
};

export const ParameterLocations = {
  Body: 'body',
  FormData: 'formData',
  Header: 'header',
  Path: 'path',
  Query: 'query',
};

export const ResponseCodes = {
  $200: '200',
  $201: '201',
  $202: '202',
  $203: '203',
  $204: '204',
  $205: '205',
  $206: '206',
  $207: '207',
  $208: '208',
  $226: '226',
  $default: 'default',
};

export const Visibility = {
  Advanced: 'advanced',
  Internal: 'internal',
  Important: 'important',
  ReadOnly: 'read-only',
};

export const TriggerTypes = {
  Single: 'single',
  Batch: 'batch',
};

export const Types = {
  Array: 'array',
  Boolean: 'boolean',
  File: 'file',
  Integer: 'integer',
  Null: 'null',
  Number: 'number',
  Object: 'object',
  String: 'string',
  Any: 'any',
};

export const OutputSource = {
  StatusCode: 'statusCode',
  Queries: 'queries',
  Headers: 'headers',
  Body: 'body',
  Outputs: 'outputs',
};

// NOTE(shimedh): Update _getTokenTitle method in tokeninputs when a new entry is added in OutputKeys
export const OutputKeys = {
  Body: 'key-body-output',
  Headers: 'key-headers-output',
  Item: 'key-item-output',
  Outputs: 'key-outputs-output',
  Queries: 'key-queries-output',
  StatusCode: 'key-statuscode-output',
  Name: 'key-name-output',
  Properties: 'key-properties-output',
  PathParameters: 'key-pathparameters-output',
};

export const ReservedParameterNames = {
  ConnectionId: 'connectionId',
};

export const OutputMapKey = 'key';
export const FormatByte = 'byte';

export class ExpressionConstants {
  public static Expression = {
    maxExpressionLimit: 8192,
  };

  public static TokenValue = {
    dot: '.',
    comma: ',',
    leftParenthesis: '(',
    rightParenthesis: ')',
    leftSquareBracket: '[',
    rightSquareBracket: ']',
    questionMark: '?',
    singleQuote: "'",
  };
}
