declare const _default: {
    API_TIER: {
        PREMIUM: string;
        STANDARD: string;
    };
    SKU: {
        STANDARD: string;
        CONSUMPTION: string;
    };
    ACTION_PALETTE_KEY: string;
    ARM_RESOURCE: {
        FUNCTION: {
            TYPE: string;
            RESOURCE_TYPE: string;
        };
    };
    ANALYTICS_SERVICE_URI: string;
    AUTHENTICATION: string;
    AUTHENTICATION_KEY: string;
    DEBATCH_KEY: string;
    BATCH_TRIGGER: string;
    BOOLEAN_PARAMETER_VALUE: {
        TRUE: string;
        FALSE: string;
    };
    PARAMETER_NULL_VALUE: string;
    CONTENT_SIZE_MAX: number;
    API_CATEGORIES: {
        APP_SERVICES: string;
        AZURE_FUNCTIONS: string;
        MICROSOFT_MANAGED: string;
        WORKFLOWS: string;
        API_MANAGEMENT: string;
    };
    API_KINDS: {
        BOT_APP: string;
        FUNCTION_APP: string;
        WORKFLOW_APP: string;
    };
    API_SUBCATEGORIES: {
        AZURE_FUNCTION: string;
        AZURE_FUNCTION_WITH_SWAGGER: string;
        API_MANAGEMENT_API: string;
        API_MANAGEMENT_SERVICE: string;
    };
    API_TYPES: {
        WEBSITE_OLD: string;
        WEBSITE_NEW: string;
    };
    AZURE_FUNCTION: {
        AUTHORIZATION_LEVEL: {
            ANONYMOUS: string;
            FUNCTION: string;
        };
        GENERIC_JSON_WEBHOOK: string;
        HTTP_TRIGGER: string;
    };
    BATCH_GROUP_NAME: {
        DEFAULT: string;
    };
    BATCH_NAME: {
        DEFAULT: string;
    };
    BATCH_TRIGGER_MODE: {
        INLINE: string;
        INTEGRATION_ACCOUNT: string;
    };
    BATCH_TRIGGER_RELEASE_CRITERIA: {
        MESSAGE_COUNT: string;
        BATCH_SIZE: string;
        SCHEDULE: string;
    };
    CHILD_GRAPH_KEYS: {
        ACTIONS: string;
        CASES: string;
    };
    CHILD_NODE_KEYS: {
        ELSE: string;
        DEFAULT: string;
    };
    CONCURRENCY_ACTION_SLIDER_LIMITS: {
        DEFAULT: number;
        MIN: number;
        MAX: number;
    };
    CONCURRENCY_TRIGGER_SLIDER_LIMITS: {
        DEFAULT: number;
        MIN: number;
        MAX: number;
    };
    CONDITION_COLORS: {
        YES: string;
        NO: string;
    };
    CONDITION_COLORS_V2: {
        YES: string;
        NO: string;
    };
    CONNECTION_ID: string;
    CONNECTIONS_KEY: string;
    CONNECTION_STATUS_CODE: {
        CONNECTED: string;
        UNAUTHENTICATED: string;
    };
    CONTEXT_SETTING: {
        ACTION_CONCURRENCY_DEFAULT: string;
        ACTION_CONCURRENCY_MIN: string;
        ACTION_CONCURRENCY_MAX: string;
        DEFAULT_RECURRENCE: string;
        LOCALE: string;
        SETTING_TRIGGER_CONCURRENCY_DESCRIPTION: string;
        SETTING_ACTION_CONCURRENCY_DESCRIPTION: string;
        TRIGGER_CONCURRENCY_DEFAULT: string;
        TRIGGER_CONCURRENCY_MIN: string;
        TRIGGER_CONCURRENCY_MAX: string;
    };
    DATETIME_FORMAT_STRINGS: string[];
    DEFAULT_BRAND_COLOR: string;
    DEFAULT_FREQUENCY_VALUE: string;
    DEFAULT_INTERVAL_VALUE: number;
    DEFAULT_KEY_PREFIX: string;
    DEFAULT_MAX_STATE_HISTORY_SIZE: number;
    DEFAULT_SCHEMA: {
        URL: string;
        VERSION: string;
    };
    EDITOR: {
        AGENT_INSTRUCTION: string;
        ARRAY: string;
        AUTHENTICATION: string;
        CODE: string;
        CONDITION: string;
        COMBOBOX: string;
        COPYABLE: string;
        DICTIONARY: string;
        DROPDOWN: string;
        FILEPICKER: string;
        FLOATINGACTIONMENU: string;
        SCHEMA: string;
        STRING: string;
        TABLE: string;
        INITIALIZE_VARIABLE: string;
        VARIABLE_NAME: string;
        HTML: string;
        RECURRENCE: string;
    };
    EDITOR_OPTIONS: {
        LANGUAGE: {
            CSHARP: string;
            JAVASCRIPT: string;
            JSON: string;
            POWERSHELL: string;
        };
    };
    DEFAULT_CUSTOM_CODE_INPUT: string;
    EVENT_AUTH_COMPLETED: string;
    ERROR_MESSAGES: {
        FAILED_TO_FETCH: string;
        NO_AVAILABLE_STORAGE_METHOD_FOUND: string;
    };
    ERROR_NAMES: {
        UNAUTHORIZED: string;
    };
    FILEPICKER_TYPE: {
        FILE: string;
        FOLDER: string;
    };
    FOREACH_CURRENT_ITEM_KEY: string;
    FOREACH_CURRENT_ITEM_EXPRESSION_NAME: string;
    FREQUENCY: {
        MONTH: string;
        WEEK: string;
        DAY: string;
        HOUR: string;
        MINUTE: string;
        SECOND: string;
    };
    FUNCTION_NAME: {
        VARIABLES: string;
        PARAMETERS: string;
        AGENT_PARAMETERS: string;
    };
    GATEWAY_CHECKBOX_KEY: string;
    GATEWAY_DEFAULT_REFRESH_INTERVAL_IN_MILLISECONDS: number;
    HTTP_WEBHOOK_LIST_CALLBACK_URL_NAME: string;
    HTTP_WEBHOOK_LIST_CALLBACK_URL_KEY: string;
    HTTP_WEBHOOK_PARAMETER_KEYS: {
        SUBSCRIBE_AUTHENTICATION: string;
        SUBSCRIBE_BODY: string;
        SUBSCRIBE_HEADER: string;
        SUBSCRIBE_METHOD: string;
        SUBSCRIBE_URI: string;
        UNSUBSCRIBE_AUTHENTICATION: string;
        UNSUBSCRIBE_BODY: string;
        UNSUBSCRIBE_HEADER: string;
        UNSUBSCRIBE_METHOD: string;
        UNSUBSCRIBE_URI: string;
    };
    HTTP_AUTHENTICATION_TYPE: {
        NONE: string;
        BASIC: string;
        CERTIFICATE: string;
        OAUTH: string;
        RAW: string;
        MSI: string;
    };
    HTTP_AUTHENTICATION_OAUTH_TYPE: {
        SECRET: string;
        CERTIFICATE: string;
    };
    HTTP_METHOD: {
        GET: string;
        PUT: string;
        POST: string;
        PATCH: string;
        DELETE: string;
    };
    INT_MAX: number;
    INT_MIN: number;
    INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP_ARTIFACT_TYPES: string[];
    ITEM: string;
    LINKS: {
        APIM_LEARN_MORE: string;
        CUSTOM_API: string;
        FUNCTION: string;
        FUNCTION_CONTAINER: string;
        MANAGED_API: string;
        MANAGED_API_LOGICAPPS: string;
        USERVOICE: string;
        WORKFLOW: string;
    };
    LOCATION: {
        australiaeast: string;
        australiasoutheast: string;
        brazilsouth: string;
        centralindia: string;
        centralus: string;
        eastasia: string;
        eastus: string;
        eastus2: string;
        japaneast: string;
        japanwest: string;
        northcentralus: string;
        northeurope: string;
        southcentralus: string;
        southeastasia: string;
        southindia: string;
        westeurope: string;
        westindia: string;
        westus: string;
    };
    MANUAL_BUTTON_TRIGGER_OUTPUTS_NAMES: {
        BUTTON_TRIGGER_OUTPUT_USERID: string;
        BUTTON_TRIGGER_OUTPUT_USERNAME_ENCODED: string;
        BUTTON_TRIGGER_OUTPUT_EMAIL_ENCODED: string;
        BUTTON_TRIGGER_OUTPUT_TIMESTAMP: string;
        BUTTON_TRIGGER_OUTPUT_FORMATED_DATE: string;
        BUTTON_TRIGGER_OUTPUT_LOCATION_FULL_ADDRESS: string;
        BUTTON_TRIGGER_OUTPUT_LOCATION_COUNTRY: string;
        BUTTON_TRIGGER_OUTPUT_LOCATION_CITY: string;
        BUTTON_TRIGGER_OUTPUT_LOCATION_POSTALCODE: string;
        BUTTON_TRIGGER_OUTPUT_LOCATION_STATE: string;
        BUTTON_TRIGGER_OUTPUT_LOCATION_STREET: string;
        BUTTON_TRIGGER_OUTPUT_LOCATION_LATITUDE: string;
        BUTTON_TRIGGER_OUTPUT_LOCATION_LONGITUDE: string;
    };
    MANUAL_TRIGGER_OUTPUT: string;
    MAX_COMMENT_LENGTH: number;
    MAX_EXPAND_ARRAY_DEPTH: number;
    MAX_DYNAMICALLY_ADDED_PARAMETERS: number;
    MAX_NEST_SCOPE_DEPTH: number;
    MAX_PAGING_COUNT: number;
    MAX_TITLE_LENGTH: number;
    MAX_VISIBLE_ACTION_BUTTON_NUMBERS: number;
    MAX_VISIBLE_ACTION_BUTTON_NUMBERS_IF: number;
    MAX_VISIBLE_ACTION_BUTTON_NUMBERS_SCOPE: number;
    MAX_VARIABLE_NAME_LENGTH: number;
    MAX_INTEGER_NUMBER: number;
    NO_ERROR_MESSAGE_LEVEL: number;
    NODE: {
        CATEGORY: {
            NOT_SPECIFIED: string;
            ACTION: string;
            TRIGGER: string;
            BRANCH: string;
        };
        TYPE: {
            NOT_SPECIFIED: string;
            PLACEHOLDER: string;
            CONDITION: string;
            CONNECTION_WIZARD: string;
            ELSE: string;
            SWITCH_CASE: string;
            SWITCH_DEFAULT: string;
            PLACEHOLDER_TRIGGER: string;
            API_CONNECTION_WEBHOOK: string;
            API_CONNECTION: string;
            API_CONNECTION_NOTIFICATION: string;
            API_MANAGEMENT: string;
            APPEND_TO_ARRAY_VARIABLE: string;
            APPEND_TO_STRING_VARIABLE: string;
            BATCH: string;
            COMPOSE: string;
            DECREMENT_VARIABLE: string;
            EXPRESSION: string;
            FLAT_FILE_DECODING: string;
            FLAT_FILE_ENCODING: string;
            FOREACH: string;
            FUNCTION: string;
            HANDOFF: string;
            HTTP_WEBHOOK: string;
            HTTP: string;
            IF: string;
            INCREMENT_VARIABLE: string;
            INITIALIZE_VARIABLE: string;
            INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP: string;
            JOIN: string;
            LIQUID: string;
            MANUAL: string;
            MCP_CLIENT: string;
            OPEN_API_CONNECTION: string;
            OPEN_API_CONNECTION_WEBHOOK: string;
            OPEN_API_CONNECTION_NOTIFICATION: string;
            PARSE_JSON: string;
            QUERY: string;
            RECURRENCE: string;
            REQUEST: string;
            RESPONSE: string;
            SCOPE: string;
            SELECT: string;
            SEND_TO_BATCH: string;
            SET_VARIABLE: string;
            SLIDING_WINDOW: string;
            SWITCH: string;
            AGENT: string;
            NESTED_AGENT: string;
            AGENT_CONDITION: string;
            TABLE: string;
            TERMINATE: string;
            UNTIL: string;
            WAIT: string;
            WORKFLOW: string;
            XML_VALIDATION: string;
            XSLT: string;
            CONNECTOR: string;
        };
        KIND: {
            ADDTOTIME: string;
            APICONNECTION: string;
            BUTTON: string;
            CONVERTTIMEZONE: string;
            CURRENTTIME: string;
            EVENTGRID: string;
            GEOFENCE: string;
            GETFUTURETIME: string;
            GETPASTTIME: string;
            HTTP: string;
            AGENT: string;
            JSON_TO_JSON: string;
            JSON_TO_TEXT: string;
            POWERAPP: string;
            POWERAPPV2: string;
            SECURITY_CENTER_ALERT: string;
            SUBTRACTFROMTIME: string;
            TEAMS: string;
            TEAMSWEBHOOK: string;
            VIRTUALAGENT: string;
            XML_TO_JSON: string;
            XML_TO_TEXT: string;
            MANAGED: string;
            BUILTIN: string;
        };
        PHASE: {
            NOT_SPECIFIED: string;
            AUTH: string;
            CHOOSE_PREREQUISITE_CONNECTION: string;
            CONDITION: string;
            CONNECTION_WIZARD: string;
            CREATE_CONFIG_CONNECTION: string;
            CREATE_CONNECTION_ASSISTED: string;
            CREATE_PARAMETERSET_CONNECTION: string;
            CREATE_SIMPLE_CONNECTION: string;
            ERROR: string;
            FUNCTION_CREATE: string;
            HTTP_SWAGGER_ENDPOINT: string;
            OPERATION_SELECT: string;
            PARAMETERS: string;
            STATIC_RESULT: string;
            PEEK: string;
            PROFILE: string;
            RECOMMENDATION: string;
            RUN_AFTER_SETTINGS: string;
            SETTINGS: string;
            SELECT_BATCH_TRIGGER: string;
            SELECT_MANUAL_TRIGGER: string;
        };
    };
    OBJECT: string;
    OUTPUTS: string;
    OPEN_API_CONNECTION: {
        BODY: string;
    };
    OUTPUT_LOCATIONS: {
        BODY: string;
        HEADERS: string;
        QUERIES: string;
        STATUS_CODE: string;
        NAME: string;
        PROPERTIES: string;
        RELATIVE_PATH_PARAMETERS: string;
    };
    PARAMETER_NAMES: {
        VARIABLES: string;
        AGENT_PARAMETER_SCHEMA: string;
        LIMIT_COUNT: string;
        LIMIT_TIMEOUT: string;
    };
    PARAMETER_VALUE_TYPE: {
        ALTERNATIVE: string;
    };
    PANEL_TAB_NAMES: {
        ABOUT: string;
        CODE_VIEW: string;
        FUNCTION_CREATE: string;
        MONITORING: string;
        OPERATION_SELECTOR: string;
        PARAMETERS: string;
        CHANNELS: string;
        REQUEST_HISTORY: string;
        RETRY_HISTORY: string;
        RUN_AFTER: string;
        SCRATCH: string;
        SETTINGS: string;
        STATIC_RESULT: string;
        SWAGGER_ENDPOINT: string;
        TESTING: string;
        MOCK_RESULTS: string;
        HANDOFF: string;
    };
    TEMPLATE_PANEL_TAB_NAMES: {
        OVERVIEW: string;
        WORKFLOW_VIEW: string;
        CONNECTIONS: string;
        PARAMETERS: string;
        BASIC: string;
        REVIEW_AND_CREATE: string;
    };
    CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES: {
        WORKFLOWS: string;
        CONNECTIONS: string;
        PARAMETERS: string;
        PROFILE: string;
        SUMMARY: string;
        SELECT_WORKFLOWS: string;
        CUSTOMIZE_WORKFLOWS: string;
    };
    MCP_PANEL_TAB_NAMES: {
        CONNECTORS: string;
        OPERATIONS: string;
        CONNECTIONS: string;
    };
    ERRORS_PANEL_TAB_NAMES: {
        ERRORS: string;
        WARNINGS: string;
    };
    PROFILE_KEY_TYPE: {
        DESIGNER: string;
        INITIALIZE_NODES: string;
        INITIALIZE_TOPOLOGY: string;
        NODEID: string;
        PRE_INITIALIZE_NODES: string;
        POST_INITIALIZE_NODES: string;
        WORKFLOW_LOAD: string;
    };
    PATH: string;
    POST: string;
    PROPERTY: {
        BROWSE: string;
        FILE_PICKER: string;
        OPEN: string;
        VALUE_COLLECTION: string;
        VALUE_DESCRIPTION: string;
        VALUE_FOLDER_PROPERTY: string;
        VALUE_MEDIA_PROPERTY: string;
        VALUE_PATH: string;
        VALUE_PROPERTY: string;
        VALUE_SELECTABLE: string;
        VALUE_TITLE: string;
    };
    RAW: string;
    DEFAULT_RECURRENCE: {
        interval: number;
        frequency: string;
    };
    RECURRENCE_OPTIONS: {
        FREE: {
            interval: number;
            frequency: string;
        };
        STANDARD: {
            interval: number;
            frequency: string;
        };
        PREMIUM: {
            interval: number;
            frequency: string;
        };
        CONSUMPTION: {
            interval: number;
            frequency: string;
        };
    };
    RECURRENCE_FREQUENCY_VALUES: string[];
    RECURRENCE_TITLE_JOIN_SEPARATOR: string;
    RECURRENCE_SCHEDULE_VALUES: {
        WEEKDAYS: string[];
        HOURS: number[];
    };
    RECURRENCE_TIMEZONE_VALUES: string[];
    RESULT_SIZE: number;
    RESULT_SIZE_ALL: number;
    RETRY_POLICY_LIMITS: {
        MAX_COUNT: number;
        MIN_COUNT: number;
    };
    RETRY_POLICY_TYPE: {
        DEFAULT: string;
        FIXED: string;
        EXPONENTIAL: string;
        NONE: string;
    };
    SCHEMA: {
        GA_PREVIEW_20160401: {
            URL: string;
            VERSION: string;
        };
        GA_20160601: {
            URL: string;
            VERSION: string;
        };
    };
    SEARCH_THROTTLE_LIMIT_IN_MS: number;
    SECURE_OBJECT: string;
    FLOW_STATUS: {
        ABORTED: string;
        CANCELLED: string;
        FAILED: string;
        FAULTED: string;
        IGNORED: string;
        PAUSED: string;
        RUNNING: string;
        SKIPPED: string;
        SUCCEEDED: string;
        SUSPENDED: string;
        TIMEDOUT: string;
        WAITING: string;
    };
    SWAGGER_SOURCE: {
        WEBSITE: string;
        CUSTOM: string;
    };
    TABLE_COLUMNS: {
        AUTOMATIC: string;
        CUSTOM: string;
    };
    TABLE_FORMAT: {
        CSV: string;
        HTML: string;
    };
    TEMPLATE_GALLERY_SUPPORTED_SCHEMA_VERSIONS: string[];
    TOKENS: {
        [x: string]: string[];
    };
    KEY_SEGMENTS: {
        BUILTIN: string;
        SYSTEM: string;
        FUNCTION: string;
        CONTENT: string;
        FILENAME: string;
    };
    SERIALIZED_TYPE: {
        API_CONNECTION: string;
        API_CONNECTION_NOTIFICATION: string;
        API_CONNECTION_WEBHOOK: string;
        API_MANAGEMENT: string;
        APPEND_TO_ARRAY_VARIABLE: string;
        APPEND_TO_STRING_VARIABLE: string;
        BATCH: string;
        CONDITION: string;
        COMPOSE: string;
        DECREMENT_VARIABLE: string;
        EXPRESSION: string;
        FLAT_FILE_DECODING: string;
        FLAT_FILE_ENCODING: string;
        FOREACH: string;
        FUNCTION: string;
        HTTP: string;
        HTTP_WEBHOOK: string;
        IF: string;
        INCREMENT_VARIABLE: string;
        INITIALIZE_VARIABLE: string;
        INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP: string;
        JOIN: string;
        LIQUID: string;
        MANUAL: string;
        MCP_CLIENT: string;
        OPEN_API_CONNECTION: string;
        OPEN_API_CONNECTION_WEBHOOK: string;
        OPEN_API_CONNECTION_NOTIFICATION: string;
        PARSE_JSON: string;
        QUERY: string;
        REQUEST: string;
        RECURRENCE: string;
        RESPONSE: string;
        SCOPE: string;
        SELECT: string;
        SEND_TO_BATCH: string;
        SET_VARIABLE: string;
        SLIDING_WINDOW: string;
        SWITCH: string;
        TABLE: string;
        TERMINATE: string;
        UNTIL: string;
        WAIT: string;
        WORKFLOW: string;
        XML_VALIDATION: string;
        XSLT: string;
    };
    SERIALIZED_KIND: {
        ADDTOTIME: string;
        APICONNECTION: string;
        BUTTON: string;
        CURRENTTIME: string;
        CONVERTTIMEZONE: string;
        EVENTGRID: string;
        GETFUTURETIME: string;
        GETPASTTIME: string;
        HTTP: string;
        JSON_TO_JSON: string;
        JSON_TO_TEXT: string;
        GEOFENCE: string;
        XML_TO_JSON: string;
        XML_TO_TEXT: string;
        POWERAPP: string;
        POWERAPPV2: string;
        SECURITY_CENTER_ALERT: string;
        SUBTRACTFROMTIME: string;
        TEAMS: string;
        VIRTUALAGENT: string;
    };
    SETTINGS: {
        OPERATION_OPTIONS: {
            ASYNCHRONOUS: string;
            DISABLE_ASYNC: string;
            DISABLE_AUTOMATIC_DECOMPRESSION: string;
            REQUEST_SCHEMA_VALIDATION: string;
            SEQUENTIAL: string;
            SINGLE_INSTANCE: string;
            SUPPRESS_WORKFLOW_HEADERS: string;
            SUPPRESS_WORKFLOW_HEADERS_ON_RESPONSE: string;
            FAILWHENLIMITSREACHED: string;
        };
        TRANSFER_MODE: {
            CHUNKED: string;
        };
        PROPERTY_NAMES: {
            RUNTIME_CONFIGURATION: string;
            CONTENT_TRANSFER: string;
            TRANSFER_MODE: string;
            PAGINATION_POLICY: string;
            MINIMUM_ITEM_COUNT: string;
            CONCURRENCY: string;
            REPETITIONS: string;
            RUNS: string;
            MAXIMUM_WAITING_RUNS: string;
            STATIC_RESULT: string;
            SECURE_DATA: string;
            UPLOAD_CHUNK_SIZE: string;
            DOWNLOAD_CHUNK_SIZE: string;
        };
        SECURE_DATA_PROPERTY_NAMES: {
            INPUTS: string;
            OUTPUTS: string;
        };
        SPLITON: {
            AUTOLOAD: string;
        };
    };
    MAXIMUM_WAITING_RUNS: {
        CONSUMPTION: {
            min: number;
            max: number;
        };
        DEFAULT: {
            min: number;
            max: number;
        };
    };
    SWAGGER: {
        TYPE: {
            ANY: string;
            ARRAY: string;
            BOOLEAN: string;
            FILE: string;
            INTEGER: string;
            NUMBER: string;
            OBJECT: string;
            STRING: string;
        };
        FORMAT: {
            BINARY: string;
            BYTE: string;
            DATAURI: string;
            DATE: string;
            DATETIME: string;
            DOUBLE: string;
            EMAIL: string;
            FLOAT: string;
            HOSTNAME: string;
            INT32: string;
            INT64: string;
            IPV4: string;
            IPV6: string;
            HTML: string;
            JAVASCRIPT: string;
            URI: string;
            UUID: string;
        };
        COLLECTION_FORMAT: {
            CSV: string;
        };
    };
    SYSTEM_ASSIGNED_MANAGED_IDENTITY: string;
    TIP_LOGGING_KEYS: {
        ACTION_RECOMMENDATION: string;
        AUTO_CASTING_TOKEN_FOR_PARAMETER: string;
        AZURE_FUNCTION_WITHOUT_SWAGGER: string;
        EXCEL_CONNECTOR: string;
        GOOGLE_SHEETS_CONNECTOR: string;
        IMPLICIT_FOREACH: string;
        INVALID_RECURRENT_TRIGGER: string;
        INVALID_RESPONSE: string;
        ODATA_PARAMETER: string;
        OPTIONAL_TOKEN_IN_REQUIRED_FIELD: string;
        PARAMETER_SUGGESTION: string;
        REQUEST_TRIGGER_SCHEMA: string;
        SERVICE_BUS_TRIGGER: string;
        SET_VARIABLE_ACTION_INSIDE_FOREACH: string;
        SHAREPOINT_CONNECTOR_CARD: string;
        SQL_SERVER_PAGING_ACTION: string;
        TRIGGER_RECOMMENDATION: string;
    };
    TRIGGER_BODY_OUTPUT: string;
    TRIGGER_QUERIES_OUTPUT: string;
    TRIGGER_HEADERS_OUTPUT: string;
    TRIGGER_STATUS_CODE_OUTPUT: string;
    TRIGGER_OUTPUTS_OUTPUT: string;
    UIDEFINITION_TYPES: {
        BOOLEAN: string;
        INTEGER: string;
        SECURESTRING: string;
        STRING: string;
    };
    UIOPERATION_TYPES: {
        SELECT_APIMANAGEMENT_ACTION: string;
        SELECT_APIMANAGEMENT_TRIGGER: string;
        SELECT_APPSERVICE_ACTION: string;
        SELECT_APPSERVICE_TRIGGER: string;
        SELECT_FUNCTION_ACTION: string;
        SELECT_BATCH_WORKFLOW_ACTION: string;
        SELECT_MANUAL_WORKFLOW_ACTION: string;
    };
    UNTIL_CURRENT_ITERATION_INDEX_KEY: string;
    VALUE_UPDATE_INTERVAL_IN_MS: number;
    VARIABLE_TYPE: {
        ARRAY: string;
        BOOLEAN: string;
        FLOAT: string;
        INTEGER: string;
        OBJECT: string;
        STRING: string;
    };
    VISIBILITY: {
        ADVANCED: string;
        IMPORTANT: string;
        INTERNAL: string;
    };
    INCREMENT_VARIABLE_SUPPORTED_TYPES: string[];
    WEBHOOK_PATH_POSTFIX: string;
    WILD_INDEX_SEGMENT: string;
    WORKFLOW: string;
    STATUS_CODES: {
        NO_CONTENT: number;
        OK: number;
        UNAUTHORIZED: number;
    };
    SMART_SUGGESTION: {
        CONNECTOR_LIMIT: number;
        OPERATIONS_PER_CONNECTOR_LIMIT: number;
    };
    Settings: {
        SETTING_SEPARATOR_COLOR_DARK: string;
        SETTING_SEPARATOR_COLOR_LIGHT: string;
        CHEVRON_ROOT_COLOR_LIGHT: string;
    };
    AZURE_RESOURCE_ACTION_TYPES: {
        SELECT_APIMANAGEMENT_ACTION: string;
        SELECT_APIMANAGEMENT_TRIGGER: string;
        SELECT_APPSERVICE_ACTION: string;
        SELECT_APPSERVICE_TRIGGER: string;
        SELECT_FUNCTION_ACTION: string;
        SELECT_SWAGGER_FUNCTION_ACTION: string;
        SELECT_BATCH_WORKFLOW_ACTION: string;
        SELECT_BATCH_WORKFLOW_TRIGGER: string;
        SELECT_MANUAL_WORKFLOW_ACTION: string;
        SELECT_NESTED_AGENT_WORKFLOW_ACTION: string;
    };
    CHANNELS: {
        INPUT: string;
        OUTPUT: string;
    };
    SUPPORTED_AGENT_MODELS: string[];
    HANDOFF_TOOL_NAME_MAX_LENGTH: number;
    CONNECTION_IDS: {
        ACA_SESSION: string;
        AGENT: string;
    };
    RUN_POLLING_INTERVAL_IN_MS: number;
};
export default _default;
