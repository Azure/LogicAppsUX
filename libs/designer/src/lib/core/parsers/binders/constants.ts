export default {
  API_CONNECTION: {
    AUTHENTICATION: 'authentication',
    BODY: 'body',
    HEADERS: 'headers',
    HOST: 'host',
    METHOD: 'method',
    PATH: 'path',
    QUERIES: 'queries',
  },
  API_MANAGEMENT: {
    BODY: 'body',
    HEADERS: 'headers',
    ID: 'id',
    METHOD: 'method',
    NAME: 'name',
    PATH_TEMPLATE: 'pathTemplate',
    QUERIES: 'queries',
    STATUS_CODE: 'statusCode',
    SUBSCRIPTION_KEY: 'subscriptionKey',
  },
  APPEND_TO_ARRAY_VARIABLE: {
    NAME: 'name',
    VALUE: 'value',
  },
  APPEND_TO_STRING_VARIABLE: {
    NAME: 'name',
    VALUE: 'value',
  },
  AS2_DECODE: {
    AGREEMENT_NAME: 'agreementName',
    ERRORS: 'errors',
    FILE_NAME: 'fileName',
    IS_DUPLICATE_MESSAGE: 'isDuplicateMessage',
    IS_MDN_EXPECTED: 'isMdnExpected',
    IS_MDN_SIGNED: 'isMdnSigned',
    IS_MESSAGE_COMPRESSED: 'isMessageCompressed',
    IS_MESSAGE_ENCRYPTED: 'isMessageEncrypted',
    IS_MESSAGE_SIGNED: 'isMessageSigned',
    MDN_DISPOSITION_MODE: 'mdnDispositionMode',
    MDN_DISPOSITION_TYPE: 'mdnDispositionType',
    MDN_FINAL_RECIPIENT: 'mdnFinalRecipient',
    MDN_STATUS_CODE: 'mdnStatusCode',
    MDN_TYPE: 'mdnType',
    MESSAGE_CONTENT: 'messageContent',
    MESSAGE_HEADERS: 'messageHeaders',
    MESSAGE_ID: 'messageId',
    MESSAGE_TO_DECODE: 'messageToDecode',
    MESSAGE_PROCESSING_STATUS: 'messageProcessingStatus',
    MESSAGE_TYPE: 'messageType',
    MIC_HASH: 'micHash',
    MIC_VERIFICATION_STATUS: 'micVerificationStatus',
    ORIGINAL_MESSAGE_ID: 'originalMessageId',
    ORIGINAL_MESSAGE_MIC_HASH_FROM_MDN: 'originalMessageMicHashFromMdn',
    OUTGOING_MDN_CONTENT: 'outgoingMdnContent',
    OUTGOING_MDN_HEADERS: 'outgoingMdnHeaders',
    RECEIVER_PARTNER_NAME: 'receiverPartnerName',
    SENDER_PARTNER_NAME: 'senderPartnerName',
  },
  AS2_ENCODE: {
    AGREEMENT_NAME: 'agreementName',
    AS2_FROM: 'as2From',
    AS2_TO: 'as2To',
    CONTENT_TYPE: 'contentType',
    FILE_NAME: 'fileName',
    IS_MDN_EXPECTED: 'isMdnExpected',
    IS_MESSAGE_COMPRESSED: 'isMessageCompressed',
    IS_MESSAGE_ENCRYPTED: 'isMessageEncrypted',
    IS_MESSAGE_SIGNED: 'isMessageSigned',
    MDN_TYPE: 'mdnType',
    MESSAGE_CONTENT: 'messageContent',
    MESSAGE_HEADERS: 'messageHeaders',
    MESSAGE_ID: 'messageId',
    MESSAGE_TO_ENCODE: 'messageToEncode',
    MIC_HASH: 'micHash',
    RECEIVER_PARTNER_NAME: 'receiverPartnerName',
    SENDER_PARTNER_NAME: 'senderPartnerName',
  },
  BATCH: {
    BATCH_NAME: 'batchName',
    ITEMS: 'items',
    PARTITION_NAME: 'partitionName',
  },
  DECREMENT_VARIABLE: {
    DECREMENT_BY: 'value',
    NAME: 'name',
    VALUE: 'value',
  },
  DEFAULT: {
    INPUTS: 'inputs',
    OUTPUTS: 'outputs',
  },
  ERROR: {
    CODE: 'code',
    MESSAGE: 'message',
    UNEXPECTED: 'unexpected',
    FRIENDLYERRORMESSAGE: 'friendlyErrorMessage',
  },
  FLAT_FILE: {
    BODY: 'body',
    CONTENT: 'content',
    EMPTY_NODE_GENERATION_MODE: 'emptyNodeGenerationMode',
    SCHEMA_NAME: 'schemaName',
  },
  FORMAT: {
    DATE_TIME: 'date-time',
    DECIMAL: 'decimal',
    HTML: 'html',
    KEY_VALUE_PAIRS: 'key-value-pairs',
    XML: 'xml',
  },
  FUNCTION: {
    APP_NAME: 'appName',
    AUTHENTICATION: 'authentication',
    BODY: 'body',
    HEADERS: 'headers',
    METHOD: 'method',
    NAME: 'name',
    QUERIES: 'queries',
    STATUS_CODE: 'statusCode',
    URI: 'uri',
  },
  GEOFENCE: {
    CENTER_LATITUDE: 'centerLatitude',
    CENTER_LONGITUDE: 'centerLongitude',
    CURRENT_LATITUDE: 'currentLatitude',
    CURRENT_LONGITUDE: 'currentLongitude',
    RADIUS: 'radius',
    TYPE: 'geofence',
  },
  HTTP: {
    AUTHENTICATION: 'authentication',
    BODY: 'body',
    COOKIE: 'cookie',
    HEADERS: 'headers',
    METHOD: 'method',
    QUERIES: 'queries',
    URI: 'uri',
  },
  IF: {
    EXPRESSION_RESULT: 'expressionResult',
  },
  INCREMENT_VARIABLE: {
    INCREMENT_BY: 'value',
    NAME: 'name',
    VALUE: 'value',
  },
  INITIALIZE_VARIABLE: {
    NAME: 'name',
    TYPE: 'type',
    VALUE: 'value',
  },
  INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP: {
    AGREEMENT: {
      AGREEMENT_TYPE: 'agreementType',
      AS2: 'as2',
      B2B: 'b2b',
      CHANGED_TIME: 'changedTime',
      CREATED_TIME: 'createdTime',
      GUEST_IDENTITY: 'guestIdentity',
      GUEST_PARTNER: 'guestPartner',
      HOST_IDENTITY: 'hostIdentity',
      HOST_PARTNER: 'hostPartner',
      NAME: 'name',
      X12: 'x12',
    },
    ARTIFACT_NAME: 'artifactName',
    ARTIFACT_TYPE: 'artifactType',
    MAP: {
      BODY: 'body',
      CHANGED_TIME: 'changedTime',
      CONTENT_LINK: 'contentLink',
      CREATED_TIME: 'createdTime',
      MAP_TYPE: 'mapType',
      METADATA: 'metadata',
      NAME: 'name',
    },
    PARTNER: {
      BUSINESS_IDENTITIES: 'businessIdentities',
      CHANGED_TIME: 'changedTime',
      CREATED_TIME: 'createdTime',
      METADATA: 'metadata',
      NAME: 'name',
      PARTNER_TYPE: 'partnerType',
    },
    SCHEMA: {
      BODY: 'body',
      CHANGED_TIME: 'changedTime',
      CONTENT_LINK: 'contentLink',
      CREATED_TIME: 'createdTime',
      DOCUMENT_NAME: 'documentName',
      METADATA: 'metadata',
      NAME: 'name',
      SCHEMA_TYPE: 'schemaType',
      TARGET_NAMESPACE: 'targetNamespace',
    },
  },
  JAVASCRIPT_CODE: {
    ACTIONS: 'actions',
    BODY: 'body',
    CODE: 'code',
    INCLUDE_TRIGGER: 'includeTrigger',
  },
  JOIN: {
    BODY: 'body',
    FROM: 'from',
    JOIN_WITH: 'joinWith',
  },
  LIQUID: {
    BODY: 'body',
    CONTENT: 'content',
    MAP_NAME: 'mapName',
  },
  MANUAL: {
    BODY: 'body',
    HEADERS: 'headers',
    HEADERS_DISAMBIGUATED: '$.headers',
    METHOD: 'method',
    RELATIVE_PATH: 'relativePath',
    RELATIVE_PATH_PARAMETERS: 'relativePathParameters',
    RELATIVE_PATH_PARAMETERS_DISAMBIGUATED: '$.relativePathParameters',
    SCHEMA: 'schema',
  },
  OUTPUTS: {
    BODY: 'body',
    HEADERS: 'headers',
    STATUS_CODE: 'statusCode',
  },
  PARAMETER_VALUE_SIZE_LIMIT: 65536,
  PARSE_JSON: {
    BODY: 'body',
    CONTENT: 'content',
    ERRORS: 'errors',
    SCHEMA: 'schema',
  },
  QUERY: {
    BODY: 'body',
    FROM: 'from',
  },
  RECURRENCE: {
    COUNT: 'count',
    END_TIME: 'endTime',
    FREQUENCY: 'frequency',
    INTERVAL: 'interval',
    SCHEDULE: 'schedule',
    START_TIME: 'startTime',
    TIME_ZONE: 'timeZone',
  },
  RESPONSE: {
    STATUS_CODE: 'statusCode',
    HEADERS: 'headers',
    BODY: 'body',
    SCHEMA: 'schema',
  },
  ROSETTANET_DECODE: {
    ACTION_TYPE: 'actionType',
    ERRORS: 'errors',
    GUEST_PARTNER_NAME: 'guestPartnerName',
    HOME_ROLE: 'homeRole',
    HOST_PARTNER_NAME: 'hostPartnerName',
    MAX_RETRY_COUNT: 'maxRetryCount',
    MIC_DIGEST: 'micDigest',
    MESSAGE_CONTENT: 'messageContent',
    MESSAGE_HEADERS: 'messageHeaders',
    MESSAGE_TO_DECODE: 'messageToDecode',
    MESSAGE_TYPE: 'messageType',
    OUTBOUND_SIGNAL: 'outboundSignal',
    PROCESS_CONFIGURATION_CODE: 'processConfigurationCode',
    PROCESS_CONFIGURATION_INSTANCE_IDENTITY: 'processConfigurationInstanceIdentity',
    PROCESS_CONFIGURATION_VERSION: 'processConfigurationVersion',
    RESPONSE_TYPE: 'responseType',
    TRACKING_ID: 'trackingId',
  },
  ROSETTANET_ENCODE: {
    ACTION_TYPE: 'actionType',
    GUEST_PARTNER_NAME: 'guestPartnerName',
    HOME_ROLE: 'homeRole',
    HOST_PARTNER_NAME: 'hostPartnerName',
    MESSAGE_CONTENT: 'messageContent',
    MESSAGE_HASH: 'messageHash',
    MESSAGE_HEADERS: 'messageHeaders',
    MESSAGE_TO_ENCODE: 'messageToEncode',
    MESSAGE_TYPE: 'messageType',
    OUTBOUND_URI: 'outboundUri',
    PROCESS_CONFIGURATION_CODE: 'processConfigurationCode',
    PROCESS_CONFIGURATION_INSTANCE_IDENTITY: 'processConfigurationInstanceIdentity',
    PROCESS_CONFIGURATION_VERSION: 'processConfigurationVersion',
    RESPONSE_TYPE: 'responseType',
    TRACKING_ID: 'trackingId',
  },
  ROSETTANET_WAIT_FOR_RESPONSE: {
    HOME_ROLE: 'homeRole',
    NOTIFICATION_OF_FAILURE: 'notificationOfFailure',
    POLLING_INTERVAL_COUNT: 'count',
    POLLING_INTERVAL_UNIT: 'unit',
    PROCESS_CONFIGURATION_INSTANCE_IDENTITY: 'processConfigurationInstanceIdentity',
    RETRY_COUNT: 'retryCount',
    SERVICE_CONTENT: 'serviceContent',
    WAIT_FOR_RESPONSE_RESULT: 'waitForResponseResult',
  },
  SELECT: {
    BODY: 'body',
    FROM: 'from',
  },
  SEND_TO_BATCH: {
    BATCH_NAME: 'batchName',
    CONTENT: 'content',
    HEADERS: 'headers',
    MESSAGE_ID: 'messageId',
    PARTITION_NAME: 'partitionName',
    STATUS_CODE: 'statusCode',
    TRIGGER_NAME: 'triggerName',
    WORKFLOW: 'workflow',
  },
  SET_VARIABLE: {
    NAME: 'name',
    VALUE: 'value',
  },
  SLIDING_WINDOW: {
    DELAY: 'delay',
    WINDOW_END_TIME: 'windowEndTime',
    WINDOW_START_TIME: 'windowStartTime',
  },
  SWITCH: {
    EXPRESSION_RESULT: 'expressionResult',
  },
  TABLE: {
    BODY: 'body',
    COLUMNS: 'columns',
    FROM: 'from',
    FORMAT: 'format',
  },
  TERMINATE: {
    CODE: 'runError.code',
    MESSAGE: 'runError.message',
    STATUS: 'runStatus',
  },
  UNTYPED: {
    INPUTS: 'inputs',
    OUTPUTS: 'outputs',
  },
  WAIT: {
    COUNT: 'count',
    TIMESTAMP: 'timestamp',
    UNIT: 'unit',
  },
  WORKFLOW: {
    BODY: 'body',
    HEADERS: 'headers',
    TRIGGER_NAME: 'triggerName',
    WORKFLOW: 'workflow',
  },
  XML_VALIDATION: {
    CONTENT: 'content',
    ERRORS: 'errors',
    SCHEMA_NAME: 'schemaName',
  },
  XSLT: {
    BODY: 'body',
    CONTENT: 'content',
    FUNCTION_ID: 'functionId',
    MAP_NAME: 'mapName',
  },
};
