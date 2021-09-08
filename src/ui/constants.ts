const CONDITION_RELATIONSHIP_VALUES = {
    CONTAINS: 'contains',
    DOES_NOT_CONTAIN: 'does not contain',
    IS_EQUAL_TO: 'is equal to',
    IS_NOT_EQUAL_TO: 'is not equal to',
    IS_GREATER_THAN: 'is greater than',
    IS_GREATER_THAN_OR_EQUAL_TO: 'is greater than or equal to',
    IS_LESS_THAN: 'is less than',
    IS_LESS_THAN_OR_EQUAL_TO: 'is less than or equal to',
    STARTS_WITH: 'starts with',
    DOES_NOT_STARTS_WITH: 'does not start with',
    ENDS_WITH: 'ends with',
    DOES_NOT_END_WITH: 'does not end with'
};

const WORKFLOW_PARAMETER_TYPE = {
    ARRAY: 'array',
    BOOLEAN: 'boolean',
    BOOL: 'bool',
    FLOAT: 'float',
    INTEGER: 'integer',
    INT: 'int',
    OBJECT: 'object',
    SECURE_OBJECT: 'secureobject',
    SECURE_STRING: 'securestring',
    STRING: 'string'
};

const WORKFLOW_PARAMETER_SERIALIZED_TYPE = {
    ARRAY: 'Array',
    BOOLEAN: 'Boolean',
    BOOL: 'Bool',
    FLOAT: 'Float',
    INTEGER: 'Integer',
    INT: 'Int',
    OBJECT: 'Object',
    SECURE_OBJECT: 'SecureObject',
    SECURE_STRING: 'SecureString',
    STRING: 'String'
};

export default {
    KEYS: {
        BACKSPACE: 8,
        ENTER: 13,
        ESCAPE: 27,
        SPACE: 32,
        DELETE: 46
    },

    MOUSE_BUTTONS: {
        NONE: 0,
        LEFT: 1,
        RIGHT: 2
    },

    FORMAT: {
        URI: 'uri'
    },

    CHECKBOX_OPACITY: 0.2,
    DURATION_OPACITY: 0.3,
    HEADER_AND_TOKEN_OPACITY: 0.15,

    DARK_BRAND_COLOR: '#3A4148',
    DEFAULT_BRAND_COLOR: '#474747',

    FOLDER: 'folder',
    FILE: 'file',
    PATH_DELIMITER: '/',

    // Key Codes
    KEY_CODES: {
        ARROW_UP: 'ArrowUp',
        ARROW_DOWN: 'ArrowDown'
    },

    // Run status
    STATUS: {
        ABORTED: 'Aborted',
        CANCELLED: 'Cancelled',
        FAILED: 'Failed',
        FAULTED: 'Faulted',
        IGNORED: 'Ignored',
        NOT_SPECIFIED: 'NotSpecified',
        PAUSED: 'Paused',
        RUNNING: 'Running',
        SKIPPED: 'Skipped',
        SUCCEEDED: 'Succeeded',
        SUSPENDED: 'Suspended',
        TIMEDOUT: 'TimedOut',
        WAITING: 'Waiting'
    },

    CONDITIONCONTROLPROPS: {
        NAME: 0,
        RELATIONSHIP: 1,
        VALUE: 2,
        ADVANCED: 3
    },

    CONDITION_RELATIONSHIP_VALUES,

    CONDITION_ENUM_FOR_BOOLEAN: [
        CONDITION_RELATIONSHIP_VALUES.IS_EQUAL_TO,
        CONDITION_RELATIONSHIP_VALUES.IS_NOT_EQUAL_TO
    ],
    CONDITION_ENUM_FOR_STRING: [
        CONDITION_RELATIONSHIP_VALUES.CONTAINS,
        CONDITION_RELATIONSHIP_VALUES.DOES_NOT_CONTAIN,
        CONDITION_RELATIONSHIP_VALUES.IS_EQUAL_TO,
        CONDITION_RELATIONSHIP_VALUES.IS_NOT_EQUAL_TO,
        CONDITION_RELATIONSHIP_VALUES.IS_GREATER_THAN,
        CONDITION_RELATIONSHIP_VALUES.IS_GREATER_THAN_OR_EQUAL_TO,
        CONDITION_RELATIONSHIP_VALUES.IS_LESS_THAN,
        CONDITION_RELATIONSHIP_VALUES.IS_LESS_THAN_OR_EQUAL_TO,
        CONDITION_RELATIONSHIP_VALUES.STARTS_WITH,
        CONDITION_RELATIONSHIP_VALUES.DOES_NOT_STARTS_WITH,
        CONDITION_RELATIONSHIP_VALUES.ENDS_WITH,
        CONDITION_RELATIONSHIP_VALUES.DOES_NOT_END_WITH
    ],
    CONDITION_ENUM_FOR_NUMBER: [
        CONDITION_RELATIONSHIP_VALUES.IS_EQUAL_TO,
        CONDITION_RELATIONSHIP_VALUES.IS_NOT_EQUAL_TO,
        CONDITION_RELATIONSHIP_VALUES.IS_LESS_THAN,
        CONDITION_RELATIONSHIP_VALUES.IS_LESS_THAN_OR_EQUAL_TO,
        CONDITION_RELATIONSHIP_VALUES.IS_GREATER_THAN,
        CONDITION_RELATIONSHIP_VALUES.IS_GREATER_THAN_OR_EQUAL_TO
    ],

    LIMIT_PROPS_FOR_UNTIL: {
        COUNT: 0,
        TIMEOUT: 1
    },

    MANAGED_IDENTITY_CREATE_HELP_URL: 'https://aka.ms/create-managed-service-identity',
    PREMIUM: 'Premium',
    PREVIEW: 'Preview',
    RECOMMENDATION_CREATE_OPERATION_HELP_URL: 'https://aka.ms/custom-connectors',
    TOKEN_PICKER_INCLUDING_DYNAMIC_CONTENT_LEARN_MORE_URL: 'https://aka.ms/logicapps-dynamiccontent',

    SERVICE_PRINCIPAL_HELP_LINK: 'https://aka.ms/logicapps-serviceprincipal',

    TELEMETRY_IDENTIFIERS: {
        ACTIONBUTTON: 'actionbutton',
        ACTIONBUTTONV2: 'actionbuttonv2',
        ACTIONPALETTE: 'actionpalette',
        AUTH: 'auth',
        AUTH_CREATE: 'auth_create',
        AUTH_CANCEL: 'auth_cancel',
        AUTH_MANAGED_IDENTITY_INFO: 'auth_managed_identity_info',
        AUTH_MANAGED_IDENTITY_LINK: 'auth_managed_identity_link',
        AUTH_SERVICE_PRINCIPAL_LINK: 'auth_service_principal_link',
        AUTH_SERVICE_PRINCIPAL_INFO: 'auth_service_principal_info',
        AUTH_MANUAL_CONNECTION_LINK: 'auth_manual_connection_link',
        AUTH_CONNECTION_ASSIST_CANCEL: 'auth_connection_assist_cancel',
        AUTH_CONNECTION_ASSIST_CREATE: 'auth_connection_assist_create',
        AUTH_CONNECTION_ASSIST_ROW: 'auth_connection_assist_row',
        AUTH_CONNECTION_ASSIST_NAVBACK: 'auth_connection_assist_navback',
        BASECOMPONENT: 'basecomponent',
        BUTTON: 'button',
        CARD: 'card',
        CARDV2: 'cardv2',
        CARD_HEADER: 'card_header',
        CARD_HEADER_MENU: 'card_header_menu',
        CONFIG: 'config',
        CONFIG_BROWSE_SUBSCRIPTION: 'config_browse_subscription',
        CONFIG_CANCEL: 'config_cancel',
        CONFIG_CREATE: 'config_create',
        CONFIG_SIGNIN: 'config_signin',
        COMMENTBOX: 'CommentBox',
        DOCUMENTATION_LINK_CLICK: 'documentation_link_click',
        FLYOUT: 'flyout',
        FOR_YOU_MRU_CONNECTOR_CLICK: 'MSLA.FOR_YOU_MRU_CONNECTOR_CLICK',
        FOR_YOU_SUGGESTED_CONNECTOR_CLICK: 'MSLA.FOR_YOU_SUGGESTED_CONNECTOR_CLICK',
        FOR_YOU_SUGGESTED_OPERATION_CLICK: 'MSLA.FOR_YOU_SUGGESTED_OPERATION_CLICK',
        FUNCTIONEDITOR: 'FunctionEditor',
        FUNCTIONEDITOR2: 'FunctionEditor2',
        INSERT_BUTTON: 'insert_button',
        LINKPANEL: 'linkpanel',
        MENU: 'Menu',
        MENU_ITEM: 'Menu-item',
        MENU_SUB_ITEM: 'Menu-sub-item',
        MONITOR_INPUTS: 'monitor_inputs',
        MONITOR_INPUTS_MORE: 'monitor_inputs_more',
        MONITOR_INPUTS_RAW: 'monitor_inputs_raw',
        MONITOR_OUTPUTS: 'monitor_outputs',
        MONITOR_OUTPUTS_MORE: 'monitor_outputs_more',
        MONITOR_OUTPUTS_RAW: 'monitor_outputs_raw',
        MONITOR_TRACE: 'monitor_trace',
        PALETTE: 'palette',
        PANEL_CONTAINER_TAB: 'panel_container_tab',
        PANEL_TOGGLE: 'panel_toggle',
        RECOMMENDATIONCANCELBUTTON: 'RecommendationCancelButton',
        RECOMMENDATIONLOADMOREBUTTON: 'RecommendationLoadMoreButton',
        RECOMMENDATIONOPERATION: 'RecommendationOperation',
        RECOMMENDATIONOPERATIONS: 'RecommendationOperations',
        RECOMMENDATIONSEARCHBUTTON: 'RecommendationSearchButton',
        RECOMMENDATIONSERVICE: 'RecommendationService',
        RECOMMENDATIONSERVICES: 'RecommendationServices',
        RUN_AFTER_DELETE_BUTTON_CLICK: 'MSLA.RUN_AFTER_DELETE_BUTTON_CLICK',
        SCOPEV2: 'scopev2',
        TITLE: 'CardTitle',
        TOGGLE: 'Toggle',
        VALUELINK: 'valuelink',
        VALUELIST: 'valuelist'
    },
    // NOTE(johnwa): The resources string for category are matching with prefix: TEMPLATE_PICKER_CATEGORY_
    TEMPLATE_CATEGORIES: [
        'BLOCKCHAIN',
        'ENTERPRISE_INTEGRATION',
        'GENERAL',
        'PRODUCTIVITY',
        'SCHEDULE',
        'SECURITY',
        'SOCIAL',
        'SYNC'
    ],
    TEMPLATE_PICKER_SORT: {
        CREATED_TIME: 'TEMPLATE_PICKER_SORT_CREATED_TIME',
        NAME: 'TEMPLATE_PICKER_SORT_NAME',
        CHANGED_TIME: 'TEMPLATE_PICKER_SORT_CHANGED_TIME',
        POPULARITY: 'TEMPLATE_PICKER_SORT_POPULARITY'
    },
    TEMPLATE_PICKER_SORT_KEYS: {
        CHANGED_TIME: 'CHANGED_TIME',
        CREATED_TIME: 'CREATED_TIME',
        NAME: 'NAME',
        POPULARITY: 'POPULARITY'
    },

    ZERO_WIDTH_SPACE: '\u200c',

    Z_INDICES: {
        HIGHEST: 999
    },

    TOKEN_PICKER_CONTROL_CLASSES: {
        TOKEN_PICKER: 'msla-token-picker',
        DISMISSIBLE: 'msla-token-picker-dismissible-control',
        NON_DISMISSIBLE: 'msla-token-picker-non-dismissible-control'
    },

    TRANSFORM_INTERACTIVE_ZONE_CLASS_NAME: 'msla-transform-interactive-zone',

    SECURE_OUTPUT_DESCRIPTION_ID: 'secure-output-description-id',

    WORKFLOW_PARAMETER_SERIALIZED_TYPE,
    WORKFLOW_PARAMETER_TYPE
};
