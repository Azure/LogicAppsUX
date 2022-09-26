export const Outlook = {
  swagger: '2.0',
  info: {
    version: '1.0',
    title: 'Office 365 Outlook',
    description:
      "Microsoft Office 365 is a cloud-based service that is designed to help meet your organization's needs for robust security, reliability, and user productivity.",
    'x-ms-api-annotation': {
      status: 'Production',
    },
  },
  host: 'logic-apis-westus.azure-apim.net',
  basePath: '/apim/office365',
  schemes: ['https'],
  paths: {
    '/{connectionId}/$metadata.json/datasets/calendars/tables/{table}': {
      get: {
        tags: ['CalendarsTableMetadata'],
        summary: 'Get calendar metadata',
        description: 'This operation gets metadata for a calendar.',
        operationId: 'CalendarGetTable',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar.',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/TableMetadata',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-calendar-metadata',
        },
      },
    },
    '/{connectionId}/$metadata.json/datasets/contacts/tables/{table}': {
      get: {
        tags: ['ContactsTableMetadata'],
        summary: 'Get folder metadata',
        description: 'This operation gets metadata for a contacts folder.',
        operationId: 'ContactGetTable',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a contacts folder.',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/TableMetadata',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-folder-metadata',
        },
      },
    },
    '/{connectionId}/Events/OnUpcomingEvents': {
      get: {
        tags: ['Events'],
        summary: 'When an upcoming event is starting soon',
        description: 'This operation triggers a flow when an upcoming calendar event is starting.',
        operationId: 'OnUpcomingEvents',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'query',
            description: 'Unique identifier of the calendar.',
            required: true,
            'x-ms-summary': 'Calendar Id',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'lookAheadTimeInMinutes',
            in: 'query',
            description: 'Time (in minutes) to look ahead for upcoming events.',
            required: false,
            'x-ms-summary': 'Look-Ahead Time',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 15,
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/CalendarEventList',
            },
          },
          '202': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, create a calendar item that is starting soon.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnSoonEvents',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-upcoming-event-is-starting-soon-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v2/Events/OnUpcomingEvents': {
      get: {
        tags: ['Events'],
        summary: 'When an upcoming event is starting soon (V2)',
        description: 'This operation triggers a flow when an upcoming calendar event is starting.',
        operationId: 'OnUpcomingEventsV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'query',
            description: 'Unique identifier of the calendar.',
            required: true,
            'x-ms-summary': 'Calendar Id',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'lookAheadTimeInMinutes',
            in: 'query',
            description: 'Time (in minutes) to look ahead for upcoming events.',
            required: false,
            'x-ms-summary': 'Look-Ahead Time',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 15,
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/CalendarEventListClientReceive',
            },
          },
          '202': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, create a calendar item that is starting soon.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnSoonEvents',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-upcoming-event-is-starting-soon-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v3/Events/OnUpcomingEvents': {
      get: {
        tags: ['Events'],
        summary: 'When an upcoming event is starting soon (V3)',
        description: 'This operation triggers a flow when an upcoming calendar event is starting.',
        operationId: 'OnUpcomingEventsV3',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'query',
            description: 'Unique identifier of the calendar.',
            required: true,
            'x-ms-summary': 'Calendar Id',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: 'lookAheadTimeInMinutes',
            in: 'query',
            description: 'Time (in minutes) to look ahead for upcoming events.',
            required: false,
            'x-ms-summary': 'Look-Ahead Time',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 15,
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/GraphCalendarEventListClientReceive',
            },
          },
          '202': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, create a calendar item that is starting soon.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnSoonEvents',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-upcoming-event-is-starting-soon-(v3)',
        },
      },
    },
    '/{connectionId}/Events/CalendarView': {
      get: {
        tags: ['Events'],
        summary: 'Get calendar view of events',
        description: 'Get calendar view of events.',
        operationId: 'GetEventsCalendarView',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'calendarId',
            in: 'query',
            description: 'Select a calendar.',
            required: true,
            'x-ms-summary': 'Calendar Id',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'startDateTimeOffset',
            in: 'query',
            description: "Start time (example: '2017-01-01T08:00:00-07:00').",
            required: true,
            'x-ms-summary': 'Start Time',
            type: 'string',
          },
          {
            name: 'endDateTimeOffset',
            in: 'query',
            description: "End time (example: '2017-02-01T08:00:00-07:00').",
            required: true,
            'x-ms-summary': 'End Time',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/PaginatedListResponse[CalendarEventClientReceiveStringEnums]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetEventsCalendarView',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-calendar-view-of-events-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/{table}/EventSubscriptionPoke/$subscriptions': {
      post: {
        tags: ['EventSubscription'],
        summary: 'When an event is added, updated or deleted in a calendar - Outlook subscription',
        description: 'Create an Outlook webhook subscription for the trigger when an event is added, updated or deleted in a calendar.',
        operationId: 'CreateOnChangedEventPokeSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar.',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
          {
            name: 'incomingDays',
            in: 'query',
            description: 'Number of incoming days in calendar to be tracked.',
            required: false,
            'x-ms-summary': 'Incoming Days Tracked',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 300,
          },
          {
            name: 'pastDays',
            in: 'query',
            description: 'Number of past days in calendar to be tracked.',
            required: false,
            'x-ms-summary': 'Past Days Tracked',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 50,
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-event-is-added%2c-updated-or-deleted-in-a-calendar---outlook-subscription',
        },
      },
      'x-ms-notification-content': {
        description: 'Poke notification',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/{table}/GraphEventSubscriptionPoke/$subscriptions': {
      post: {
        tags: ['EventSubscription'],
        summary: 'When an event is added, updated or deleted in a calendar - Graph subscription',
        description: 'Create a Graph webhook subscription for the trigger when an event is added, updated or deleted in a calendar.',
        operationId: 'CreateGraphOnChangedEventPokeSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar.',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
          {
            name: 'incomingDays',
            in: 'query',
            description: 'Number of incoming days in calendar to be tracked.',
            required: false,
            'x-ms-summary': 'Incoming Days Tracked',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 300,
          },
          {
            name: 'pastDays',
            in: 'query',
            description: 'Number of past days in calendar to be tracked.',
            required: false,
            'x-ms-summary': 'Past Days Tracked',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 50,
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-event-is-added%2c-updated-or-deleted-in-a-calendar---graph-subscription',
        },
      },
      'x-ms-notification-content': {
        description: 'Poke notification',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/EventSubscription/$subscriptions/{id}': {
      delete: {
        tags: ['EventSubscription'],
        summary: 'Delete event subscription',
        description: 'This operation deletes an event subscription.',
        operationId: 'DeleteEventSubscription',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Id of subscription to be deleted.',
            required: true,
            'x-ms-summary': 'Id of subscription to be deleted',
            type: 'string',
          },
          {
            name: 'options',
            in: 'query',
            description: 'Subscription options.',
            required: true,
            'x-ms-summary': 'Subscription options',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#delete-event-subscription',
        },
      },
      patch: {
        tags: ['EventSubscription'],
        summary: 'Update web hook',
        description: 'Update web hook with renew interval.',
        operationId: 'RenewEventSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Id of subscription to be renewed.',
            required: true,
            'x-ms-summary': 'Id of subscription to be renewed',
            type: 'string',
          },
          {
            name: 'options',
            in: 'query',
            description: 'Subscription options.',
            required: true,
            'x-ms-summary': 'Subscription options',
            type: 'string',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          '201': {
            description: 'Subscription Created',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#update-web-hook',
        },
      },
    },
    '/{connectionId}/OnFilePickerOpen': {
      get: {
        tags: ['FilePicker'],
        summary: 'When the file picker is opened for the first time',
        description: 'When the file picker is opened for the first time.',
        operationId: 'OnFilePickerOpen',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'operation',
            in: 'query',
            description: 'Name of the operation.',
            required: true,
            'x-ms-summary': 'Name of the operation',
            type: 'string',
          },
          {
            name: 'top',
            in: 'query',
            description: 'Limit on the number of results to return.',
            required: false,
            'x-ms-summary': 'Limit on the number of results to return',
            type: 'integer',
            format: 'int32',
            default: 100,
          },
          {
            name: 'skip',
            in: 'query',
            description: 'Number of results to skip.',
            required: false,
            'x-ms-summary': 'Number of results to skip',
            type: 'integer',
            format: 'int32',
            default: 0,
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Mailbox to perform operations for.',
            required: false,
            'x-ms-summary': 'Mailbox to perform operations for',
            type: 'string',
            default: '',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[FilePickerFile]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-the-file-picker-is-opened-for-the-first-time',
        },
      },
    },
    '/{connectionId}/OnFilePickerBrowse': {
      get: {
        tags: ['FilePicker'],
        summary: 'When the file picker is open and being browsed',
        description: 'When the file picker is open and being browsed.',
        operationId: 'OnFilePickerBrowse',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'operation',
            in: 'query',
            description: 'Name of the operation.',
            required: true,
            'x-ms-summary': 'Name of the operation',
            type: 'string',
          },
          {
            name: 'id',
            in: 'query',
            description: 'Id of the previously selected item.',
            required: true,
            'x-ms-summary': 'Id of the previously selected item',
            type: 'string',
          },
          {
            name: 'top',
            in: 'query',
            description: 'Limit on the number of results to return.',
            required: false,
            'x-ms-summary': 'Limit on the number of results to return',
            type: 'integer',
            format: 'int32',
            default: 100,
          },
          {
            name: 'skip',
            in: 'query',
            description: 'Number of results to skip.',
            required: false,
            'x-ms-summary': 'Number of results to skip',
            type: 'integer',
            format: 'int32',
            default: 0,
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Mailbox to perform operations for.',
            required: false,
            'x-ms-summary': 'Mailbox to perform operations for',
            type: 'string',
            default: '',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[FilePickerFile]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-the-file-picker-is-open-and-being-browsed',
        },
      },
    },
    '/{connectionId}/Mail': {
      get: {
        tags: ['Mail'],
        summary: 'Get emails',
        description: 'This operation gets emails from a folder.',
        operationId: 'GetEmails',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: "Mail folder to retrieve emails from (default: 'Inbox').",
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'fetchOnlyUnread',
            in: 'query',
            description: 'Retrieve only unread emails?.',
            required: false,
            'x-ms-summary': 'Fetch Only Unread Messages',
            type: 'boolean',
            default: true,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'If set to true, attachments content will also be retrieved along with the email.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            type: 'boolean',
            default: false,
          },
          {
            name: 'searchQuery',
            in: 'query',
            description: 'Search query (like in the Outlook client) to filter emails.',
            required: false,
            'x-ms-summary': 'Search Query',
            type: 'string',
          },
          {
            name: 'top',
            in: 'query',
            description: 'Number of emails to retrieve (default: 10).',
            required: false,
            'x-ms-summary': 'Top',
            type: 'integer',
            format: 'int32',
            default: 10,
          },
          {
            name: 'skip',
            in: 'query',
            description: 'Number of emails to skip (default: 0).',
            required: false,
            'x-ms-summary': 'Skip',
            'x-ms-visibility': 'internal',
            type: 'integer',
            format: 'int32',
            default: 0,
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              type: 'array',
              items: {
                $ref: '#/definitions/ClientReceiveMessageStringEnums',
              },
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetEmails',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-emails-%5bdeprecated%5d',
        },
      },
      post: {
        tags: ['Mail'],
        summary: 'Send an email',
        description: 'This operation sends an email message.',
        operationId: 'SendEmail',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'emailMessage',
            in: 'body',
            description: 'Email.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSendMessage',
            },
            'x-ms-summary': 'Email',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'important',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'SendEmail',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#send-an-email-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v2/Mail': {
      get: {
        tags: ['Mail'],
        summary: 'Get emails (V2)',
        description: 'This operation gets emails from a folder.',
        operationId: 'GetEmailsV2',
        consumes: [],
        produces: ['application/json', 'text/json'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: "Mail folder to retrieve emails from (default: 'Inbox').",
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: 'fetchOnlyUnread',
            in: 'query',
            description: 'Retrieve only unread emails?.',
            required: false,
            'x-ms-summary': 'Fetch Only Unread Messages',
            type: 'boolean',
            default: true,
          },
          {
            name: 'fetchOnlyFlagged',
            in: 'query',
            description: 'Retrieve only flagged emails?.',
            required: false,
            'x-ms-summary': 'Fetch Only Flagged Messages',
            'x-ms-visibility': 'internal',
            type: 'boolean',
            default: false,
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to retrieve mails from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-visibility': 'internal',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'If set to true, attachments content will also be retrieved along with the email.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            type: 'boolean',
            default: false,
          },
          {
            name: 'searchQuery',
            in: 'query',
            description: 'Search query (like in the Outlook client) to filter emails.',
            required: false,
            'x-ms-summary': 'Search Query',
            type: 'string',
          },
          {
            name: 'top',
            in: 'query',
            description: 'Number of emails to retrieve (default: 10).',
            required: false,
            'x-ms-summary': 'Top',
            type: 'integer',
            format: 'int32',
            default: 10,
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/BatchResponse[ClientReceiveMessage]',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'GetEmails',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-emails-(v2)-%5bdeprecated%5d',
        },
      },
      post: {
        tags: ['Mail'],
        summary: 'Send an email (V2)',
        description: 'This operation sends an email message.',
        operationId: 'SendEmailV2',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'emailMessage',
            in: 'body',
            description: 'Email.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSendHtmlMessage',
            },
            'x-ms-summary': 'Email',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'important',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'SendEmail',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#send-an-email-(v2)',
        },
      },
    },
    '/{connectionId}/Mail/{messageId}': {
      get: {
        tags: ['Mail'],
        summary: 'Get email',
        description: 'This operation gets an email by id.',
        operationId: 'GetEmail',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to retrieve mail from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'If set to true, attachments content will also be retrieved along with the email.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            type: 'boolean',
            default: false,
          },
          {
            name: 'internetMessageId',
            in: 'query',
            description: 'Internet Message Id.',
            required: false,
            'x-ms-summary': 'Internet Message Id',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/ClientReceiveMessage',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetEmail',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-email-%5bdeprecated%5d',
        },
      },
      delete: {
        tags: ['Mail'],
        summary: 'Delete email',
        description: 'This operation deletes an email by id.',
        operationId: 'DeleteEmail',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to delete.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'DeleteEmail',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#delete-email-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v2/Mail/{messageId}': {
      get: {
        tags: ['Mail'],
        summary: 'Get email (V2)',
        description: 'This operation gets an email by id.',
        operationId: 'GetEmailV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to retrieve mail from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'If set to true, attachments content will also be retrieved along with the email.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            type: 'boolean',
            default: false,
          },
          {
            name: 'internetMessageId',
            in: 'query',
            description: 'Internet Message Id.',
            required: false,
            'x-ms-summary': 'Internet Message Id',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/GraphClientReceiveMessage',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetEmail',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-email-(v2)',
        },
      },
    },
    '/{connectionId}/v3/Mail': {
      get: {
        tags: ['Mail'],
        summary: 'Get emails (V3)',
        description:
          "This operation gets emails from a folder via graph apis. Please note that filtering related to these fields: To, Cc, To Or Cc, From, Importance, Fetch Only With Attachments, Subject Filter, is performed using first 250 items in a given mail folder. To avoid that limitation you can use 'Search Query' field.",
        operationId: 'GetEmailsV3',
        consumes: [],
        produces: ['application/json', 'text/json'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: "Mail folder to retrieve emails from (default: 'Inbox').",
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                mailboxAddress: {
                  parameter: 'mailboxAddress',
                },
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                  mailboxAddress: {
                    parameterReference: 'mailboxAddress',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                  mailboxAddress: {
                    parameterReference: 'mailboxAddress',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: 'fetchOnlyUnread',
            in: 'query',
            description: 'Retrieve only unread emails?.',
            required: false,
            'x-ms-summary': 'Fetch Only Unread Messages',
            type: 'boolean',
            default: true,
          },
          {
            name: 'fetchOnlyFlagged',
            in: 'query',
            description: 'Retrieve only flagged emails?.',
            required: false,
            'x-ms-summary': 'Fetch Only Flagged Messages',
            'x-ms-visibility': 'internal',
            type: 'boolean',
            default: false,
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to retrieve mails from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'If set to true, attachments content will also be retrieved along with the email.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            type: 'boolean',
            default: false,
          },
          {
            name: 'searchQuery',
            in: 'query',
            description:
              "Search query to filter emails. How to use '$search' parameter please refer to: https://docs.microsoft.com/graph/query-parameters#search-parameter.",
            required: false,
            'x-ms-summary': 'Search Query',
            type: 'string',
          },
          {
            name: 'top',
            in: 'query',
            description: 'Number of emails to retrieve (default: 10, max: 25).',
            required: false,
            'x-ms-summary': 'Top',
            type: 'integer',
            format: 'int32',
            default: 10,
            maximum: 25,
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/BatchResponse[GraphClientReceiveMessage]',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetEmails',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-emails-(v3)',
        },
      },
    },
    '/{connectionId}/Mail/Move/{messageId}': {
      post: {
        tags: ['Mail'],
        summary: 'Move email',
        description: 'This operation moves an email to the specified folder within the same mailbox.',
        operationId: 'Move',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to be moved.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to move the email to.',
            required: true,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/ClientReceiveMessageStringEnums',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'Move',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#move-email-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v2/Mail/Move/{messageId}': {
      post: {
        tags: ['Mail'],
        summary: 'Move email (V2)',
        description: 'This operation moves an email to the specified folder within the same mailbox.',
        operationId: 'MoveV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to be moved.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to move the email to.',
            required: true,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                mailboxAddress: {
                  parameter: 'mailboxAddress',
                },
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                  mailboxAddress: {
                    parameterReference: 'mailboxAddress',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                  mailboxAddress: {
                    parameterReference: 'mailboxAddress',
                  },
                },
              },
            },
            type: 'string',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to move mail from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/GraphClientReceiveMessage',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'Move',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#move-email-(v2)',
        },
      },
    },
    '/{connectionId}/Mail/Flag/{messageId}': {
      post: {
        tags: ['Mail'],
        summary: 'Flag email',
        description: 'This operation flags an email.',
        operationId: 'Flag',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to be flagged.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'Flag',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#flag-email-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/Mail/MarkAsRead/{messageId}': {
      post: {
        tags: ['Mail'],
        summary: 'Mark as read',
        description: 'This operation marks an email as having been read.',
        operationId: 'MarkAsRead',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to be marked as read.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'MarkAsRead',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#mark-as-read-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/Mail/ReplyTo/{messageId}': {
      post: {
        tags: ['Mail'],
        summary: 'Reply to email',
        description: 'This operation replies to an email.',
        operationId: 'ReplyTo',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to reply to.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'comment',
            in: 'query',
            description: 'Reply comment.',
            required: true,
            'x-ms-summary': 'Comment',
            type: 'string',
          },
          {
            name: 'replyAll',
            in: 'query',
            description: 'Reply to all recipients.',
            required: false,
            'x-ms-summary': 'Reply All',
            type: 'boolean',
            default: false,
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ReplyTo',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#reply-to-email-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v2/Mail/ReplyTo/{messageId}': {
      post: {
        tags: ['Mail'],
        summary: 'Reply to email (V2)',
        description: 'This operation replies to an email.',
        operationId: 'ReplyToV2',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to reply to.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'replyParameters',
            in: 'body',
            description: 'Details of the email reply.',
            required: true,
            schema: {
              $ref: '#/definitions/ReplyMessage',
            },
            'x-ms-summary': 'Details of the email reply.',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to reply from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ReplyTo',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#reply-to-email-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v3/Mail/ReplyTo/{messageId}': {
      post: {
        tags: ['Mail'],
        summary: 'Reply to email (V3)',
        description: 'This operation replies to an email.',
        operationId: 'ReplyToV3',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to reply to.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'replyParameters',
            in: 'body',
            description: 'Details of the email reply.',
            required: true,
            schema: {
              $ref: '#/definitions/ReplyHtmlMessage',
            },
            'x-ms-summary': 'Details of the email reply.',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to reply from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ReplyTo',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#reply-to-email-(v3)',
        },
      },
    },
    '/{connectionId}/Mail/{messageId}/Attachments/{attachmentId}': {
      get: {
        tags: ['Mail'],
        summary: 'Get attachment',
        description: 'This operation gets an email attachment by id.',
        operationId: 'GetAttachment',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'attachmentId',
            in: 'path',
            description: 'Id of the attachment to download.',
            required: true,
            'x-ms-summary': 'Attachment Id',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              format: 'binary',
              type: 'string',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetAttachment',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-attachment-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/Mail/OnNewEmail': {
      get: {
        tags: ['Mail'],
        summary: 'When a new email arrives',
        description:
          'This operation triggers a flow when a new email arrives. It will skip any email that has a total message size greater than the limit put by your Exchange Admin or 50 MB, whichever is less. It may also skip protected emails and emails with invalid body or attachments.',
        operationId: 'OnNewEmail',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: 'x-ms-operation-context',
            in: 'header',
            description: 'Special header to enable operation simulation.',
            required: false,
            'x-ms-summary': 'x-ms-operation-context',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[ClientReceiveMessage]',
            },
          },
          '202': {
            description: 'Accepted',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'important',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, send a new email in your inbox.',
        'x-ms-notification': {
          operationId: 'CreateOnNewEmailPokeSubscription',
        },
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'OnNewEmail',
          revision: 1,
        },
        'x-ms-operation-context': {
          simulate: {
            operationId: 'GetEmailsV2',
            parameters: {
              top: 1,
              fetchOnlyUnread: false,
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-email-arrives-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v2/Mail/OnNewEmail': {
      get: {
        tags: ['Mail'],
        summary: 'When a new email arrives (V2)',
        description:
          'This operation triggers a flow when a new email arrives. It will skip any email that has a total message size greater than the limit put by your Exchange Admin or 50 MB, whichever is less. It may also skip protected emails and emails with invalid body or attachments.',
        operationId: 'OnNewEmailV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: 'x-ms-operation-context',
            in: 'header',
            description: 'Special header to enable operation simulation.',
            required: false,
            'x-ms-summary': 'x-ms-operation-context',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[GraphClientReceiveMessage]',
            },
          },
          '202': {
            description: 'Accepted',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'important',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, send a new email in your inbox.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'OnNewEmail',
          revision: 2,
        },
        'x-ms-operation-context': {
          simulate: {
            operationId: 'GetEmailsV2',
            parameters: {
              top: 1,
              fetchOnlyUnread: false,
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-email-arrives-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v3/Mail/OnNewEmail': {
      get: {
        tags: ['Mail'],
        summary: 'When a new email arrives (V3)',
        description:
          'This operation triggers a flow when a new email arrives. It will skip any email that has a total message size greater than the limit put by your Exchange Admin or 50 MB, whichever is less. It may also skip protected emails and emails with invalid body or attachments.',
        operationId: 'OnNewEmailV3',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            'x-ms-enum-values': [
              {
                value: 'Any',
                displayName: 'Any',
              },
              {
                value: 'Low',
                displayName: 'Low',
              },
              {
                value: 'Normal',
                displayName: 'Normal',
              },
              {
                value: 'High',
                displayName: 'High',
              },
            ],
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: 'x-ms-operation-context',
            in: 'header',
            description: 'Special header to enable operation simulation.',
            required: false,
            'x-ms-summary': 'x-ms-operation-context',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[GraphClientReceiveMessage]',
            },
          },
          '202': {
            description: 'Accepted',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'important',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, send a new email in your inbox.',
        'x-ms-notification': {
          operationId: 'CreateGraphOnNewEmailPokeSubscription',
        },
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'OnNewEmail',
          revision: 3,
        },
        'x-ms-operation-context': {
          simulate: {
            operationId: 'GetEmailsV3',
            parameters: {
              top: 1,
              fetchOnlyUnread: false,
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-email-arrives-(v3)',
        },
      },
    },
    '/{connectionId}/Mail/OnFlaggedEmail': {
      get: {
        tags: ['Mail'],
        summary: 'When an email is flagged',
        description: 'This operation triggers a flow when an email is flagged.',
        operationId: 'OnFlaggedEmail',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: 'x-ms-operation-context',
            in: 'header',
            description: 'Special header to enable operation simulation.',
            required: false,
            'x-ms-summary': 'x-ms-operation-context',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[ClientReceiveMessage]',
            },
          },
          '202': {
            description: 'Accepted',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'important',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, flag an email in your inbox.',
        'x-ms-notification': {
          operationId: 'CreateOnFlaggedEmailPokeSubscription',
        },
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'OnFlaggedEmail',
          revision: 1,
        },
        'x-ms-operation-context': {
          simulate: {
            operationId: 'GetEmailsV2',
            parameters: {
              top: 1,
              fetchOnlyUnread: false,
              fetchOnlyFlagged: true,
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-email-is-flagged-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v2/Mail/OnFlaggedEmail': {
      get: {
        tags: ['Mail'],
        summary: 'When an email is flagged (V2)',
        description: 'This operation triggers a flow when an email is flagged.',
        operationId: 'OnFlaggedEmailV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[GraphClientReceiveMessage]',
            },
          },
          '202': {
            description: 'Accepted',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'important',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, flag an email in your inbox.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'OnFlaggedEmail',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-email-is-flagged-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v3/Mail/OnFlaggedEmail': {
      get: {
        tags: ['Mail'],
        summary: 'When an email is flagged (V3)',
        description: 'This operation triggers a flow when an email is flagged.',
        operationId: 'OnFlaggedEmailV3',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[GraphClientReceiveMessage]',
            },
          },
          '202': {
            description: 'Accepted',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'important',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, flag an email in your inbox.',
        'x-ms-notification': {
          operationId: 'CreateGraphOnFlaggedEmailPokeSubscription',
        },
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'OnFlaggedEmail',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-email-is-flagged-(v3)',
        },
      },
    },
    '/{connectionId}/v4/Mail/OnFlaggedEmail': {
      get: {
        tags: ['Mail'],
        summary: 'When an email is flagged (V4)',
        description: 'This operation triggers a flow when an email is flagged.',
        operationId: 'OnFlaggedEmailV4',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[GraphClientReceiveMessage]',
            },
          },
          '202': {
            description: 'Accepted',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'important',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, flag an email in your inbox.',
        'x-ms-notification': {
          operationId: 'CreateGraphOnFlaggedEmailPokeSubscription',
        },
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'OnFlaggedEmail',
          revision: 4,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-email-is-flagged-(v4)',
        },
      },
    },
    '/{connectionId}/Mail/OnNewMentionMeEmail': {
      get: {
        tags: ['Mail'],
        summary: 'When a new email mentioning me arrives',
        description:
          'This operation triggers a flow when a new email mentioning me arrives. It will skip any email that has a total message size greater than the limit put by your Exchange Admin or 50 MB, whichever is less. It may also skip protected emails and emails with invalid body or attachments.',
        operationId: 'OnNewMentionMeEmail',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageIdToFireOnFirstTriggerRun',
            in: 'query',
            description: 'Id of message to fire on first trigger run if supplied.',
            required: false,
            'x-ms-summary': 'Message Id to Fire on First Trigger Run',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[ClientReceiveMessage]',
            },
          },
          '202': {
            description: 'Accepted',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, send a new email to your inbox which mentions you.',
        'x-ms-notification': {
          operationId: 'CreateOnNewMentionMeEmailPokeSubscription',
        },
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'OnNewMentionMeEmail',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-email-mentioning-me-arrives-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v2/Mail/OnNewMentionMeEmail': {
      get: {
        tags: ['Mail'],
        summary: 'When a new email mentioning me arrives (V2)',
        description:
          'This operation triggers a flow when a new email mentioning me arrives. It will skip any email that has a total message size greater than the limit put by your Exchange Admin or 50 MB, whichever is less. It may also skip protected emails and emails with invalid body or attachments.',
        operationId: 'OnNewMentionMeEmailV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageIdToFireOnFirstTriggerRun',
            in: 'query',
            description: 'Id of message to fire on first trigger run if supplied.',
            required: false,
            'x-ms-summary': 'Message Id to Fire on First Trigger Run',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[GraphClientReceiveMessage]',
            },
          },
          '202': {
            description: 'Accepted',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, send a new email to your inbox which mentions you.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'OnNewMentionMeEmail',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-email-mentioning-me-arrives-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v3/Mail/OnNewMentionMeEmail': {
      get: {
        tags: ['Mail'],
        summary: 'When a new email mentioning me arrives (V3)',
        description:
          'This operation triggers a flow when a new email mentioning me arrives. It will skip any email that has a total message size greater than the limit put by your Exchange Admin or 50 MB, whichever is less. It may also skip protected emails and emails with invalid body or attachments.',
        operationId: 'OnNewMentionMeEmailV3',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageIdToFireOnFirstTriggerRun',
            in: 'query',
            description: 'Id of message to fire on first trigger run if supplied.',
            required: false,
            'x-ms-summary': 'Message Id to Fire on First Trigger Run',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[GraphClientReceiveMessage]',
            },
          },
          '202': {
            description: 'Accepted',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, send a new email to your inbox which mentions you.',
        'x-ms-notification': {
          operationId: 'CreateGraphOnNewMentionMeEmailPokeSubscription',
        },
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'OnNewMentionMeEmail',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-email-mentioning-me-arrives-(v3)',
        },
      },
    },
    '/{connectionId}/AutomaticRepliesSetting': {
      post: {
        tags: ['MailboxSettings'],
        summary: 'Set up automatic replies',
        description: 'Set the automatic replies setting for your mailbox.',
        operationId: 'SetAutomaticRepliesSetting',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'clientSetting',
            in: 'body',
            description: 'Settings.',
            required: true,
            schema: {
              $ref: '#/definitions/AutomaticRepliesSettingClient',
            },
            'x-ms-summary': 'Settings',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'SetAutomaticRepliesSetting',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#set-up-automatic-replies-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/MailTips': {
      get: {
        tags: ['MailboxSettings'],
        summary: 'Get mail tips for a mailbox',
        description: 'Get mail tips for a mailbox such as automatic replies / OOF message or if the mailbox is full.',
        operationId: 'GetMailTips',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the mailbox to get mail tips for.',
            required: true,
            'x-ms-summary': 'Original Mailbox Address',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/MailTipsClientReceive',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetMailTips',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-mail-tips-for-a-mailbox-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/SensitivityLabels': {
      get: {
        tags: ['MailboxSettings'],
        summary: 'Get sensitivity labels',
        description: 'Get a collection of information protection labels available to the user.',
        operationId: 'GetSensitivityLabels',
        consumes: [],
        produces: ['application/json', 'text/json'],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/BatchResponse[SensitivityLabel]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'GetSensitivityLabels',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-sensitivity-labels',
        },
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/MailSubscription/$subscriptions': {
      post: {
        tags: ['MailSubscription'],
        summary: 'When a new email arrives (webhook)',
        description: 'This operation triggers a flow when a new email arrives.',
        operationId: 'CreateOnNewEmailSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the received email ("Any", "High", "Normal", "Low").',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'hasAttachment',
            in: 'query',
            description: 'Whether the email has attachments ("Any", "Yes", "No").',
            required: false,
            'x-ms-summary': 'Has Attachment',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Yes', 'No'],
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'important',
        'x-ms-trigger': 'batch',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-email-arrives-(webhook)-%5bdeprecated%5d',
        },
      },
      'x-ms-notification-content': {
        description: 'Emails',
        schema: {
          $ref: '#/definitions/TriggerBatchResponse[ReceiveMessageMetadata]',
        },
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/MailSubscriptionPoke/$subscriptions': {
      post: {
        tags: ['MailSubscription'],
        summary: 'Create a webhook subscription for the trigger when a new email arrives',
        description: 'Create a webhook subscription for the trigger when a new email arrives.',
        operationId: 'CreateOnNewEmailPokeSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#create-a-webhook-subscription-for-the-trigger-when-a-new-email-arrives',
        },
      },
      'x-ms-notification-content': {
        description: 'Poke notification',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/GraphMailSubscriptionPoke/$subscriptions': {
      post: {
        tags: ['MailSubscription'],
        summary: 'Create a Graph webhook subscription for the trigger when a new email arrives',
        description: 'Create a Graph webhook subscription for the trigger when a new email arrives.',
        operationId: 'CreateGraphOnNewEmailPokeSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#create-a-graph-webhook-subscription-for-the-trigger-when-a-new-email-arrives',
        },
      },
      'x-ms-notification-content': {
        description: 'Poke notification',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/MentionMeMailSubscriptionPoke/$subscriptions': {
      post: {
        tags: ['MailSubscription'],
        summary: 'When a new mentioning me email arrives - Outlook subscription',
        description: 'Create an Outlook webhook subscription for the trigger when a new mentioning me email arrives.',
        operationId: 'CreateOnNewMentionMeEmailPokeSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-mentioning-me-email-arrives---outlook-subscription',
        },
      },
      'x-ms-notification-content': {
        description: 'Poke notification',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/GraphMentionMeMailSubscriptionPoke/$subscriptions': {
      post: {
        tags: ['MailSubscription'],
        summary: 'When a new mentioning me email arrives - Graph subscription',
        description: 'Create a Graph webhook subscription for the trigger when a new mentioning me email arrives.',
        operationId: 'CreateGraphOnNewMentionMeEmailPokeSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-mentioning-me-email-arrives---graph-subscription',
        },
      },
      'x-ms-notification-content': {
        description: 'Poke notification',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/FlaggedMailSubscriptionPoke/$subscriptions': {
      post: {
        tags: ['MailSubscription'],
        summary: 'Create an Outlook webhook subscription for the trigger when an email is flagged',
        description: 'Create an Outlook webhook subscription for the trigger when an email is flagged.',
        operationId: 'CreateOnFlaggedEmailPokeSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#create-an-outlook-webhook-subscription-for-the-trigger-when-an-email-is-flagged',
        },
      },
      'x-ms-notification-content': {
        description: 'Poke notification',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/GraphFlaggedMailSubscriptionPoke/$subscriptions': {
      post: {
        tags: ['MailSubscription'],
        summary: 'Create a Graph webhook subscription for the trigger when an email is flagged',
        description: 'Create a Graph webhook subscription for the trigger when an email is flagged.',
        operationId: 'CreateGraphOnFlaggedEmailPokeSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
          {
            name: 'folderPath',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'fetchOnlyWithAttachment',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#create-a-graph-webhook-subscription-for-the-trigger-when-an-email-is-flagged',
        },
      },
      'x-ms-notification-content': {
        description: 'Poke notification',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/MailSubscription/$subscriptions/{id}': {
      delete: {
        tags: ['MailSubscription'],
        summary: 'Delete mail subscription',
        description: 'This operation deletes a mail subscription.',
        operationId: 'DeleteOnNewEmailSubscription',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Id of subscription to be deleted.',
            required: true,
            'x-ms-summary': 'Id of subscription to be deleted',
            type: 'string',
          },
          {
            name: 'options',
            in: 'query',
            description: 'Subscription options.',
            required: true,
            'x-ms-summary': 'Subscription options',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#delete-mail-subscription',
        },
      },
      patch: {
        tags: ['MailSubscription'],
        summary: 'Update web hook',
        description: 'Update web hook with renew interval.',
        operationId: 'RenewOnNewEmailSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Id of subscription to be renewed.',
            required: true,
            'x-ms-summary': 'Id of subscription to be renewed',
            type: 'string',
          },
          {
            name: 'options',
            in: 'query',
            description: 'Subscription options.',
            required: true,
            'x-ms-summary': 'Subscription options',
            type: 'string',
          },
          {
            name: 'subscription',
            in: 'body',
            description: 'The subscription.',
            required: true,
            schema: {
              $ref: '#/definitions/ClientSubscription',
            },
            'x-ms-summary': 'The subscription',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          '201': {
            description: 'Subscription Created',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#update-web-hook',
        },
      },
    },
    '/{connectionId}/$metadata.json/datasets': {
      get: {
        tags: ['Office365DataSetsMetadata'],
        operationId: 'GetDataSetsMetadata',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/DataSetsMetadata',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/mailwithoptions/$subscriptions': {
      post: {
        tags: ['OptionsEmail'],
        summary: 'Send email with options',
        description:
          'This operation sends an email with multiple options and waits for the recipient to respond back with one of the options. Please refer to the following link regarding the support of actionable messages in different mail clients: https://docs.microsoft.com/outlook/actionable-messages/#outlook-version-requirements-for-actionable-messages.',
        operationId: 'SendMailWithOptions',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'optionsEmailSubscription',
            in: 'body',
            description: 'Subscription request for options email.',
            required: true,
            schema: {
              $ref: '#/definitions/OptionsEmailSubscription',
            },
            'x-ms-summary': 'Subscription request for options email',
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#send-email-with-options',
        },
      },
      'x-ms-notification-content': {
        description: 'Selected Option',
        schema: {
          $ref: '#/definitions/ApprovalEmailResponse',
        },
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/approvalmail/$subscriptions': {
      post: {
        tags: ['OptionsEmail'],
        summary: 'Send approval email',
        description:
          'This operation sends an approval email and waits for a response from the recipient. Please refer to the following link regarding the support of actionable messages in different mail clients: https://docs.microsoft.com/outlook/actionable-messages/#outlook-version-requirements-for-actionable-messages.',
        operationId: 'SendApprovalMail',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'approvalEmailSubscription',
            in: 'body',
            description: 'Subscription request for approval email.',
            required: true,
            schema: {
              $ref: '#/definitions/ApprovalEmailSubscription',
            },
            'x-ms-summary': 'Subscription request for approval email',
          },
        ],
        responses: {
          '201': {
            description: 'Subscription Created',
            schema: {
              $ref: '#/definitions/SubscriptionResponse',
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'important',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#send-approval-email',
        },
      },
      'x-ms-notification-content': {
        description: 'Selected Option',
        schema: {
          $ref: '#/definitions/ApprovalEmailResponse',
        },
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/approvalmail/$subscriptions/{id}': {
      delete: {
        tags: ['OptionsEmail'],
        summary: 'Delete approval email subscription',
        description: 'This operation deletes a subscription of approval email.',
        operationId: 'DeleteApprovalMailSubscription',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Id of subscription to be deleted.',
            required: true,
            'x-ms-summary': 'Id of subscription to be deleted',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#delete-approval-email-subscription',
        },
      },
    },
    '/{connectionId}/mailwithoptions/$subscriptions/{id}': {
      delete: {
        tags: ['OptionsEmail'],
        summary: 'Delete options email subscription',
        description: 'This operation deletes a subscription of options email.',
        operationId: 'DeleteOptionsMailSubscription',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Id of subscription to be deleted.',
            required: true,
            'x-ms-summary': 'Id of subscription to be deleted',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#delete-options-email-subscription',
        },
      },
    },
    '/{connectionId}/SharedMailbox/Mail': {
      post: {
        tags: ['SharedMailboxMail'],
        summary: 'Send an email from a shared mailbox',
        description:
          'This operation sends an email from a shared mailbox. Your account should have permission to access the mailbox for this operation to succeed.',
        operationId: 'SharedMailboxSendEmail',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'emailMessage',
            in: 'body',
            description: 'Email.',
            required: true,
            schema: {
              $ref: '#/definitions/SharedMailboxClientSendMessage',
            },
            'x-ms-summary': 'Email',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'SharedMailboxSendEmail',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#send-an-email-from-a-shared-mailbox-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v2/SharedMailbox/Mail': {
      post: {
        tags: ['SharedMailboxMail'],
        summary: 'Send an email from a shared mailbox (V2)',
        description:
          'This operation sends an email from a shared mailbox. Your account should have permission to access the mailbox for this operation to succeed.',
        operationId: 'SharedMailboxSendEmailV2',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'emailMessage',
            in: 'body',
            description: 'Email.',
            required: true,
            schema: {
              $ref: '#/definitions/SharedMailboxClientSendHtmlMessage',
            },
            'x-ms-summary': 'Email',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'SharedMailboxSendEmail',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#send-an-email-from-a-shared-mailbox-(v2)',
        },
      },
    },
    '/{connectionId}/SharedMailbox/Mail/OnNewEmail': {
      get: {
        tags: ['SharedMailboxMail'],
        summary: 'When a new email arrives in a shared mailbox',
        description:
          'This operation triggers a flow when a new email arrives in a shared mailbox. Your account should have permission to access the mailbox for this operation to succeed. It will skip any email that has a total message size greater than the limit put by your Exchange Admin or 50 MB, whichever is less. It may also skip protected emails and emails with invalid body or attachments.',
        operationId: 'SharedMailboxOnNewEmail',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox.',
            required: true,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
          {
            name: 'folderId',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                mailboxAddress: {
                  parameter: 'mailboxAddress',
                },
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                  mailboxAddress: {
                    parameterReference: 'mailboxAddress',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                  mailboxAddress: {
                    parameterReference: 'mailboxAddress',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'hasAttachments',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: 'x-ms-operation-context',
            in: 'header',
            description: 'Special header to enable operation simulation.',
            required: false,
            'x-ms-summary': 'x-ms-operation-context',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[ClientReceiveMessage]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, send a new email in your inbox.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'OnNewSharedMailboxEmail',
          revision: 1,
        },
        'x-ms-operation-context': {
          simulate: {
            operationId: 'GetEmailsV2',
            parameters: {
              top: 1,
              fetchOnlyUnread: false,
              fetchOnlyWithAttachment: {
                parameter: 'hasAttachments',
              },
              folderPath: {
                parameter: 'folderId',
              },
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-email-arrives-in-a-shared-mailbox-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/v2/SharedMailbox/Mail/OnNewEmail': {
      get: {
        tags: ['SharedMailboxMail'],
        summary: 'When a new email arrives in a shared mailbox (V2)',
        description:
          'This operation triggers a flow when a new email arrives in a shared mailbox. Your account should have permission to access the mailbox for this operation to succeed. It will skip any email that has a total message size greater than the limit put by your Exchange Admin or 50 MB, whichever is less. It may also skip protected emails and emails with invalid body or attachments.',
        operationId: 'SharedMailboxOnNewEmailV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox.',
            required: true,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
          {
            name: 'folderId',
            in: 'query',
            description: 'Mail folder to check for new emails.',
            required: false,
            'x-ms-summary': 'Folder',
            'x-ms-dynamic-values': {
              capability: 'file-picker',
              parameters: {
                isFolder: true,
                operation: 'MailFolders',
                mailboxAddress: {
                  parameter: 'mailboxAddress',
                },
                fileFilter: [],
                dataset: null,
              },
              'value-path': 'Id',
            },
            'x-ms-dynamic-tree': {
              settings: {
                canSelectParentNodes: true,
                canSelectLeafNodes: false,
              },
              open: {
                operationId: 'OnFilePickerOpen',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  operation: {
                    value: 'MailFolders',
                  },
                  mailboxAddress: {
                    parameterReference: 'mailboxAddress',
                  },
                },
              },
              browse: {
                operationId: 'OnFilePickerBrowse',
                itemValuePath: 'Id',
                itemTitlePath: 'DisplayName',
                itemIsParent: '(IsFolder eq true)',
                itemFullTitlePath: 'Path',
                itemsPath: 'value',
                parameters: {
                  id: {
                    selectedItemValuePath: 'Id',
                  },
                  operation: {
                    value: 'MailFolders',
                  },
                  mailboxAddress: {
                    parameterReference: 'mailboxAddress',
                  },
                },
              },
            },
            type: 'string',
            default: 'Inbox',
          },
          {
            name: 'to',
            in: 'query',
            description: 'Recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'cc',
            in: 'query',
            description: 'CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'toOrCc',
            in: 'query',
            description: 'To or CC recipient email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'To or CC',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'from',
            in: 'query',
            description: 'Sender email addresses separated by semicolons (If any match, the trigger will run).',
            required: false,
            'x-ms-summary': 'From',
            'x-ms-visibility': 'advanced',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
            format: 'email',
          },
          {
            name: 'importance',
            in: 'query',
            description: 'Importance of the email (Any, High, Normal, Low).',
            required: false,
            'x-ms-summary': 'Importance',
            'x-ms-visibility': 'advanced',
            type: 'string',
            default: 'Any',
            enum: ['Any', 'Low', 'Normal', 'High'],
          },
          {
            name: 'hasAttachments',
            in: 'query',
            description:
              'If set to true, only emails with an attachment will be retrieved. Emails without any attachments will be skipped. If set to false, all emails will be retrieved.',
            required: false,
            'x-ms-summary': 'Only with Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'includeAttachments',
            in: 'query',
            description: 'Should the response of the trigger include the attachments content.',
            required: false,
            'x-ms-summary': 'Include Attachments',
            'x-ms-visibility': 'advanced',
            type: 'boolean',
            default: false,
          },
          {
            name: 'subjectFilter',
            in: 'query',
            description: 'String to look for in the subject line.',
            required: false,
            'x-ms-summary': 'Subject Filter',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: 'x-ms-operation-context',
            in: 'header',
            description: 'Special header to enable operation simulation.',
            required: false,
            'x-ms-summary': 'x-ms-operation-context',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/TriggerBatchResponse[GraphClientReceiveMessage]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, send a new email in your inbox.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'OnNewSharedMailboxEmail',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-email-arrives-in-a-shared-mailbox-(v2)',
        },
      },
    },
    '/{connectionId}/testconnection': {
      get: {
        tags: ['TestConnection'],
        summary: 'Tests the connection',
        description: 'Tests the connection.',
        operationId: 'TestConnection',
        consumes: [],
        produces: [],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#tests-the-connection',
        },
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/datasets/calendars/tables': {
      get: {
        tags: ['CalendarsTable'],
        summary: 'Get calendars',
        description: 'This operation lists available calendars.',
        operationId: 'CalendarGetTables',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[Table]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetTables',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-calendars-%5bdeprecated%5d',
        },
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/datasets/calendars/tables/{table}/items': {
      get: {
        tags: ['CalendarsTableData'],
        summary: 'Get events (V1)',
        description: 'This operation gets events from a calendar. (V1)',
        operationId: 'CalendarGetItems',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[CalendarEventBackend]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetItems',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-events-(v1)-%5bdeprecated%5d',
        },
      },
      post: {
        tags: ['CalendarsTableData'],
        summary: 'Create event (V1)',
        description: 'This operation creates a new event in a calendar. (V1)',
        operationId: 'CalendarPostItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Event to create',
            required: true,
            schema: {
              $ref: '#/definitions/CalendarEventBackend',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventBackend',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'important',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarPostItem',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#create-event-(v1)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/tables/{table}/items/{id}': {
      get: {
        tags: ['CalendarsTableData'],
        summary: 'Get event (V1)',
        description: 'This operation gets a specific event from a calendar. (V1)',
        operationId: 'CalendarGetItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Select an event',
            required: true,
            'x-ms-summary': 'Item id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventBackend',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetItem',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-event-(v1)-%5bdeprecated%5d',
        },
      },
      delete: {
        tags: ['CalendarsTableData'],
        summary: 'Delete event',
        description: 'This operation deletes an event in a calendar.',
        operationId: 'CalendarDeleteItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Select an event',
            required: true,
            'x-ms-summary': 'Id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarDeleteItem',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#delete-event-%5bdeprecated%5d',
        },
      },
      patch: {
        tags: ['CalendarsTableData'],
        summary: 'Update event (V1)',
        description: 'This operation updates an event in a calendar. (V1)',
        operationId: 'CalendarPatchItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Select an event',
            required: true,
            'x-ms-summary': 'Id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Event to update',
            required: true,
            schema: {
              $ref: '#/definitions/CalendarEventBackend',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventBackend',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarPatchItem',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#update-event-(v1)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v3/tables/{table}/items': {
      get: {
        tags: ['CalendarsTableData'],
        summary: 'Get events (V3)',
        description: 'This operation gets events from a calendar. (V3)',
        operationId: 'V3CalendarGetItems',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventListClientReceive',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetItems',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-events-(v3)-%5bdeprecated%5d',
        },
      },
      post: {
        tags: ['CalendarsTableData'],
        summary: 'Create event (V3)',
        description: 'This operation creates a new event in a calendar.',
        operationId: 'V3CalendarPostItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Event to create',
            required: true,
            schema: {
              $ref: '#/definitions/CalendarEventHtmlClient',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventClientReceiveStringEnums',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'important',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarPostItem',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#create-event-(v3)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v4/tables/{table}/items': {
      get: {
        tags: ['CalendarsTableData'],
        summary: 'Get events (V4)',
        description: 'This operation gets events from a calendar using Graph API. (V4)',
        operationId: 'V4CalendarGetItems',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/GraphCalendarEventListClientReceive',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetItems',
          revision: 4,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-events-(v4)',
        },
      },
      post: {
        tags: ['CalendarsTableData'],
        summary: 'Create event (V4)',
        description: 'This operation creates a new event in a calendar.',
        operationId: 'V4CalendarPostItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Event to create',
            required: true,
            schema: {
              $ref: '#/definitions/GraphCalendarEventClient',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/GraphCalendarEventClientReceive',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'important',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarPostItem',
          revision: 4,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#create-event-(v4)',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v2/tables/{table}/items': {
      get: {
        tags: ['CalendarsTableData'],
        summary: 'Get events (V2)',
        description: 'This operation gets events from a calendar. (V2)',
        operationId: 'V2CalendarGetItems',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[CalendarEventClientReceiveStringEnums]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetItems',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-events-(v2)-%5bdeprecated%5d',
        },
      },
      post: {
        tags: ['CalendarsTableData'],
        summary: 'Create event (V2)',
        description: 'This operation creates a new event in a calendar. (V2)',
        operationId: 'V2CalendarPostItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Event to create',
            required: true,
            schema: {
              $ref: '#/definitions/CalendarEventClient',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventClientReceiveStringEnums',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'important',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarPostItem',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#create-event-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v2/tables/items/calendarview': {
      get: {
        tags: ['CalendarsTableData'],
        summary: 'Get calendar view of events (V2)',
        description:
          'This operation gets all events (including instances of recurrences) in a calendar. Recurrence property is null in this case.',
        operationId: 'GetEventsCalendarViewV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'calendarId',
            in: 'query',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar Id',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'startDateTimeOffset',
            in: 'query',
            description: "Start time (example: '2017-01-01T08:00:00-07:00')",
            required: true,
            'x-ms-summary': 'Start Time',
            type: 'string',
          },
          {
            name: 'endDateTimeOffset',
            in: 'query',
            description: "End time (example: '2017-02-01T08:00:00-07:00')",
            required: true,
            'x-ms-summary': 'End Time',
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search text for matching event body and subject',
            required: false,
            'x-ms-summary': 'Search',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[CalendarEventClientReceiveStringEnums]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetEventsCalendarView',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-calendar-view-of-events-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v3/tables/items/calendarview': {
      get: {
        tags: ['CalendarsTableData'],
        summary: 'Get calendar view of events (V3)',
        description:
          'This operation gets all events (including instances of recurrences) in a calendar using Graph API. Recurrence property is null in this case.',
        operationId: 'GetEventsCalendarViewV3',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'calendarId',
            in: 'query',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar Id',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: 'startDateTimeUtc',
            in: 'query',
            description: "Start time in UTC (example: '2017-01-01T08:00:00')",
            required: true,
            'x-ms-summary': 'Start Time',
            type: 'string',
          },
          {
            name: 'endDateTimeUtc',
            in: 'query',
            description: "End time in UTC (example: '2017-02-01T08:00:00')",
            required: true,
            'x-ms-summary': 'End Time',
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search text for matching event body and subject',
            required: false,
            'x-ms-summary': 'Search',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[GraphCalendarEventClientReceive]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetEventsCalendarView',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-calendar-view-of-events-(v3)',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v2/tables/{table}/items/{id}': {
      get: {
        tags: ['CalendarsTableData'],
        summary: 'Get event (V2)',
        description: 'This operation gets a specific event from a calendar. (V2)',
        operationId: 'V2CalendarGetItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Select an event',
            required: true,
            'x-ms-summary': 'Item id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventClientReceiveStringEnums',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetItem',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-event-(v2)-%5bdeprecated%5d',
        },
      },
      patch: {
        tags: ['CalendarsTableData'],
        summary: 'Update event (V2)',
        description: 'This operation updates an event in a calendar. (V2)',
        operationId: 'V2CalendarPatchItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Select an event',
            required: true,
            'x-ms-summary': 'Id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Event to update',
            required: true,
            schema: {
              $ref: '#/definitions/CalendarEventClient',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventClientReceiveStringEnums',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarPatchItem',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#update-event-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v3/tables/{table}/items/{id}': {
      get: {
        tags: ['CalendarsTableData'],
        summary: 'Get event (V3)',
        description: 'This operation gets a specific event from a calendar using Graph API. (V3)',
        operationId: 'V3CalendarGetItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Select an event',
            required: true,
            'x-ms-summary': 'Item id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/GraphCalendarEventClientReceive',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetItem',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-event-(v3)',
        },
      },
      patch: {
        tags: ['CalendarsTableData'],
        summary: 'Update event (V3)',
        description: 'This operation updates an event in a calendar.',
        operationId: 'V3CalendarPatchItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Select an event',
            required: true,
            'x-ms-summary': 'Id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Event to update',
            required: true,
            schema: {
              $ref: '#/definitions/CalendarEventHtmlClient',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventClientReceiveStringEnums',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarPatchItem',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#update-event-(v3)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v4/tables/{table}/items/{id}': {
      patch: {
        tags: ['CalendarsTableData'],
        summary: 'Update event (V4)',
        description: 'This operation updates an event in a calendar using Graph API.',
        operationId: 'V4CalendarPatchItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Select an event',
            required: true,
            'x-ms-summary': 'Id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Event to update',
            required: true,
            schema: {
              $ref: '#/definitions/GraphCalendarEventClient',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/GraphCalendarEventClientReceive',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarPatchItem',
          revision: 4,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#update-event-(v4)',
        },
      },
    },
    '/{connectionId}/datasets/calendars/tables/{table}/onnewitems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When a new event is created (V1)',
        description: 'This operation triggers a flow when a new event is created in a calendar. (V1)',
        operationId: 'CalendarGetOnNewItems',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: 'x-ms-operation-context',
            in: 'header',
            description: 'Special header to enable operation simulation.',
            required: false,
            'x-ms-summary': 'x-ms-operation-context',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventList',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, create a new calendar item.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnNewItems',
          revision: 1,
        },
        'x-ms-operation-context': {
          simulate: {
            operationId: 'CalendarGetItems',
            parameters: {
              $top: 1,
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-event-is-created-(v1)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/tables/{table}/onupdateditems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When an event is modified (V1)',
        description: 'This operation triggers a flow when an event is modified in a calendar. (V1)',
        operationId: 'CalendarGetOnUpdatedItems',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventList',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, update a calendar item.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnUpdatedItems',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-event-is-modified-(v1)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets({dataset})/tables({table})/onnewitems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When a new item is created in a table',
        description: 'This operation triggers a flow when a new item is created in a table.',
        operationId: 'ODataStyleGetOnNewItems',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'dataset',
            in: 'path',
            description: 'dataset name',
            required: true,
            'x-ms-summary': 'Dataset',
            type: 'string',
          },
          {
            name: 'table',
            in: 'path',
            description: 'table name',
            required: true,
            'x-ms-summary': 'Calendar id',
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventList',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, create a new calendar item.',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-item-is-created-in-a-table',
        },
      },
    },
    '/{connectionId}/datasets({dataset})/tables({table})/onupdateditems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When an item is modified',
        description: 'This operation triggers a flow when an item is modified in a table.',
        operationId: 'ODataStyleCalendarGetOnUpdatedItems',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'dataset',
            in: 'path',
            description: 'dataset name',
            required: true,
            'x-ms-summary': 'Dataset',
            type: 'string',
          },
          {
            name: 'table',
            in: 'path',
            description: 'table name',
            required: true,
            'x-ms-summary': 'Calendar id',
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventList',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, update a calendar item.',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-item-is-modified',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v2/tables/{table}/onnewitems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When a new event is created (V2)',
        description: 'This operation triggers a flow when a new event is created in a calendar. (V2)',
        operationId: 'CalendarGetOnNewItemsV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: 'x-ms-operation-context',
            in: 'header',
            description: 'Special header to enable operation simulation.',
            required: false,
            'x-ms-summary': 'x-ms-operation-context',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventListClientReceive',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, create a new calendar item.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnNewItems',
          revision: 2,
        },
        'x-ms-operation-context': {
          simulate: {
            operationId: 'V3CalendarGetItems',
            parameters: {
              $top: 1,
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-event-is-created-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v3/tables/{table}/onnewitems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When a new event is created (V3)',
        description: 'This operation triggers a flow when a new event is created in a calendar. (V3)',
        operationId: 'CalendarGetOnNewItemsV3',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: 'x-ms-operation-context',
            in: 'header',
            description: 'Special header to enable operation simulation.',
            required: false,
            'x-ms-summary': 'x-ms-operation-context',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/GraphCalendarEventListClientReceive',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, create a new calendar item.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnNewItems',
          revision: 3,
        },
        'x-ms-operation-context': {
          simulate: {
            operationId: 'V4CalendarGetItems',
            parameters: {
              $top: 1,
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-a-new-event-is-created-(v3)',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v2/tables/{table}/onupdateditems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When an event is modified (V2)',
        description: 'This operation triggers a flow when an event is modified in a calendar. (V2)',
        operationId: 'CalendarGetOnUpdatedItemsV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventListClientReceive',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, update a calendar item.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnUpdatedItems',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-event-is-modified-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v3/tables/{table}/onupdateditems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When an event is modified (V3)',
        description: 'This operation triggers a flow when an event is modified in a calendar. (V3)',
        operationId: 'CalendarGetOnUpdatedItemsV3',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'internal',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/GraphCalendarEventListClientReceive',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, update a calendar item.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnUpdatedItems',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-event-is-modified-(v3)',
        },
      },
    },
    '/{connectionId}/datasets/calendars/tables/{table}/onchangeditems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When an event is added, updated or deleted',
        description: 'This operation triggers a flow when an event is added, updated or deleted in a calendar.',
        operationId: 'CalendarGetOnChangedItems',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'incomingDays',
            in: 'query',
            description: 'Number of incoming days in calendar to be tracked',
            required: false,
            'x-ms-summary': 'Incoming Days Tracked',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 300,
          },
          {
            name: 'pastDays',
            in: 'query',
            description: 'Number of past days in calendar to be tracked',
            required: false,
            'x-ms-summary': 'Past Days Tracked',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 50,
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/CalendarEventListWithActionType',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, add, update or delete a calendar item.',
        'x-ms-notification': {
          operationId: 'CreateOnChangedEventPokeSubscription',
        },
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnChangedItems',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-event-is-added%2c-updated-or-deleted-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v2/tables/{table}/onchangeditems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When an event is added, updated or deleted (V2)',
        description: 'This operation triggers a flow when an event is added, updated or deleted in a calendar. (V2)',
        operationId: 'CalendarGetOnChangedItemsV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: 'incomingDays',
            in: 'query',
            description: 'Number of incoming days in calendar to be tracked',
            required: false,
            'x-ms-summary': 'Incoming Days Tracked',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 300,
          },
          {
            name: 'pastDays',
            in: 'query',
            description: 'Number of past days in calendar to be tracked',
            required: false,
            'x-ms-summary': 'Past Days Tracked',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 50,
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/GraphCalendarEventListWithActionType',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, add, update or delete a calendar item.',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnChangedItems',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-event-is-added%2c-updated-or-deleted-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/calendars/v3/tables/{table}/onchangeditems': {
      get: {
        tags: ['CalendarsTableDataTrigger'],
        summary: 'When an event is added, updated or deleted (V3)',
        description:
          'This operation triggers a flow when an event is added, updated or deleted in a calendar. (V3) This is not available in Mooncake.',
        operationId: 'CalendarGetOnChangedItemsV3',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: 'incomingDays',
            in: 'query',
            description: 'Number of incoming days in calendar to be tracked',
            required: false,
            'x-ms-summary': 'Incoming Days Tracked',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 300,
          },
          {
            name: 'pastDays',
            in: 'query',
            description: 'Number of past days in calendar to be tracked',
            required: false,
            'x-ms-summary': 'Past Days Tracked',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
            default: 50,
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/GraphCalendarEventListWithActionType',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-trigger': 'batch',
        'x-ms-trigger-hint': 'To see it work now, add, update or delete a calendar item.',
        'x-ms-notification': {
          operationId: 'CreateGraphOnChangedEventPokeSubscription',
        },
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetOnChangedItems',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#when-an-event-is-added%2c-updated-or-deleted-(v3)',
        },
      },
    },
    '/{connectionId}/datasets/contacts/tables': {
      get: {
        tags: ['ContactsTable'],
        summary: 'Get contact folders',
        description: 'This operation lists available contacts folders.',
        operationId: 'ContactGetTables',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[Table]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactGetTables',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-contact-folders-%5bdeprecated%5d',
        },
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/v2/datasets/contacts/tables': {
      get: {
        tags: ['ContactsTable'],
        summary: 'Get contact folders (V2)',
        description: 'This operation lists available contacts folders using Graph API',
        operationId: 'ContactGetTablesV2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[GraphContactFolder]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactGetTables',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-contact-folders-(v2)',
        },
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/datasets/contacts/tables/{table}/items': {
      get: {
        tags: ['ContactsTableData'],
        summary: 'Get contacts',
        description: 'This operation gets contacts from a contacts folder.',
        operationId: 'ContactGetItems',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Unique identifier of the contacts folder to retrieve',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[ContactResponse]',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactGetItems',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-contacts-%5bdeprecated%5d',
        },
      },
      post: {
        tags: ['ContactsTableData'],
        summary: 'Create contact',
        description: 'This operation creates a new contact in a contacts folder.',
        operationId: 'ContactPostItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a contacts folder',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Contact to create',
            required: true,
            schema: {
              $ref: '#/definitions/Contact',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/ContactResponse',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'important',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactPostItem',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#create-contact-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets/contacts/tables/{table}/items/{id}': {
      get: {
        tags: ['ContactsTableData'],
        summary: 'Get contact',
        description: 'This operation gets a specific contact from a contacts folder.',
        operationId: 'ContactGetItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a contacts folder',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Unique identifier of a contact to retrieve',
            required: true,
            'x-ms-summary': 'Item id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/ContactResponse',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactGetItem',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-contact-%5bdeprecated%5d',
        },
      },
      delete: {
        tags: ['ContactsTableData'],
        summary: 'Delete contact',
        description: 'This operation deletes a contact from a contacts folder.',
        operationId: 'ContactDeleteItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a contacts folder',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Unique identifier of contact to delete',
            required: true,
            'x-ms-summary': 'Id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactDeleteItem',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#delete-contact-%5bdeprecated%5d',
        },
      },
      patch: {
        tags: ['ContactsTableData'],
        summary: 'Update contact',
        description: 'This operation updates a contact in a contacts folder.',
        operationId: 'ContactPatchItem',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'table',
            in: 'path',
            description: 'Select a contacts folder',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTables',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'Name',
              'value-title': 'DisplayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Unique identifier of contact to update',
            required: true,
            'x-ms-summary': 'Id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Contact item to update',
            required: true,
            schema: {
              $ref: '#/definitions/Contact',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/ContactResponse',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactPatchItem',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#update-contact-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/datasets': {
      get: {
        tags: ['Office365DataSet'],
        summary: 'Get datasets',
        description: 'This operation gets Contacts or Calendars',
        operationId: 'GetDataSets',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/DataSetsList',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-datasets',
        },
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
      },
    },
    '/{connectionId}/codeless/api/beta/me/messages/{messageId}/$value': {
      get: {
        summary: 'Export email',
        description: 'Export the content of the email.',
        operationId: 'ExportEmail',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to export.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              format: 'binary',
              type: 'string',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'ExportEmail',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#export-email-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/codeless/beta/me/messages/{messageId}/$value': {
      get: {
        summary: 'Export email (V2)',
        description: 'Export the content of the email in the EML file format.',
        operationId: 'ExportEmail_V2',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to export.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to export from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              format: 'binary',
              type: 'string',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ExportEmail',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#export-email-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/messages/{messageId}/flag': {
      patch: {
        tags: ['Mail'],
        summary: 'Flag email (V2)',
        description: 'This operation updates an email flag.',
        operationId: 'Flag_V2',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to be flagged.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to update mail.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
          {
            name: 'body',
            in: 'body',
            description: 'Flag status.',
            'x-ms-summary': 'Flag Status',
            schema: {
              $ref: '#/definitions/UpdateEmailFlag',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'Flag',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#flag-email-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/messages/{messageId}/markAsRead': {
      patch: {
        tags: ['Mail'],
        summary: 'Mark as read or unread (V2)',
        description: 'This operation marks an email as read/unread.',
        operationId: 'MarkAsRead_V2',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to be marked.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to update mail.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
          {
            name: 'body',
            in: 'body',
            description: 'Mark as read',
            schema: {
              type: 'object',
              properties: {
                isRead: {
                  description: 'Mark as read/unread.',
                  'x-ms-summary': 'Mark as',
                  type: 'boolean',
                  enum: [true, false],
                  'x-ms-enum-values': [
                    {
                      displayName: 'Read',
                      value: true,
                    },
                    {
                      displayName: 'Unread',
                      value: false,
                    },
                  ],
                },
              },
            },
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'MarkAsRead',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#mark-as-read-or-unread-(v2)-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/codeless/v3/v1.0/me/messages/{messageId}/markAsRead': {
      patch: {
        tags: ['Mail'],
        summary: 'Mark as read or unread (V3)',
        description: 'This operation marks an email as read/unread.',
        operationId: 'MarkAsRead_V3',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to be marked.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to update mail.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
          {
            name: 'body',
            in: 'body',
            description: 'Mark as read',
            schema: {
              type: 'object',
              required: ['isRead'],
              properties: {
                isRead: {
                  description: 'Mark as read/unread.',
                  'x-ms-summary': 'Mark as',
                  type: 'boolean',
                  enum: [true, false],
                  'x-ms-enum-values': [
                    {
                      displayName: 'Read',
                      value: true,
                    },
                    {
                      displayName: 'Unread',
                      value: false,
                    },
                  ],
                },
              },
            },
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'MarkAsRead',
          revision: 3,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#mark-as-read-or-unread-(v3)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/messages/{messageId}': {
      delete: {
        tags: ['Mail'],
        summary: 'Delete email (V2)',
        description: 'This operation deletes an email by id.',
        operationId: 'DeleteEmail_V2',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email to delete.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to delete mail from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'Operation was successful',
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'DeleteEmail',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#delete-email-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/messages/{messageId}/attachments/{attachmentId}': {
      get: {
        tags: ['Mail'],
        summary: 'Get Attachment (V2)',
        description: 'This operation gets an email attachment by id.',
        operationId: 'GetAttachment_V2',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'messageId',
            in: 'path',
            description: 'Id of the email.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'attachmentId',
            in: 'path',
            description: 'Id of the attachment to download.',
            required: true,
            'x-ms-summary': 'Attachement Id',
            type: 'string',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to retrieve attachment from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'default',
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Id of the attachment.',
                  'x-ms-summary': 'Id',
                },
                name: {
                  type: 'string',
                  description: 'Name of attachment.',
                  'x-ms-summary': 'Name',
                },
                contentType: {
                  type: 'string',
                  description: 'Content type of attachment.',
                  'x-ms-summary': 'Content Type',
                },
                size: {
                  type: 'integer',
                  format: 'int32',
                  description: 'Size of attachment.',
                  'x-ms-summary': 'Size',
                },
                contentBytes: {
                  type: 'string',
                  format: 'byte',
                  description: 'Content of attachment.',
                  'x-ms-summary': 'Content Bytes',
                },
                isInline: {
                  type: 'boolean',
                  description: 'Set to true if this is an inline attachment.',
                  'x-ms-summary': 'Is Inline',
                },
                lastModifiedDateTime: {
                  format: 'date-time',
                  description: 'The date and time when the attachment was last modified.',
                  type: 'string',
                  'x-ms-summary': 'Last Modified DateTime',
                },
                contentId: {
                  description: 'Content Id',
                  type: 'string',
                  'x-ms-summary': 'Content Id',
                },
              },
            },
          },
          '400': {
            description: 'BadRequest',
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden',
          },
          '500': {
            description: 'Internal Server Error',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetAttachment',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-attachment-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/api/v2.0/me/events/{event_id}/{response}': {
      post: {
        summary: 'Respond to an event invite',
        description: 'Respond to an event invite.',
        operationId: 'RespondToEvent',
        consumes: ['application/json', 'text/json'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'event_id',
            in: 'path',
            description: 'Id of the event to respond to.',
            required: true,
            'x-ms-summary': 'Event Id',
            type: 'string',
          },
          {
            name: 'response',
            in: 'path',
            description: 'Response for the event invite',
            required: true,
            'x-ms-summary': 'Response',
            type: 'string',
            enum: ['Accept', 'Tentatively Accept', 'Decline'],
          },
          {
            name: 'body',
            in: 'body',
            description: 'Event invite response body.',
            required: false,
            schema: {
              $ref: '#/definitions/ResponseToEventInvite',
            },
            'x-ms-summary': 'Event invite response body',
          },
        ],
        responses: {
          '202': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'RespondToEvent',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#respond-to-an-event-invite-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/events/{event_id}/{response}': {
      post: {
        summary: 'Respond to an event invite (V2)',
        description: 'Respond to an event invite.',
        operationId: 'RespondToEvent_V2',
        consumes: ['application/json', 'text/json'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'event_id',
            in: 'path',
            description: 'Id of the event to respond to.',
            required: true,
            'x-ms-summary': 'Event Id',
            type: 'string',
          },
          {
            name: 'response',
            in: 'path',
            description: 'Response for the event invite',
            required: true,
            'x-ms-summary': 'Response',
            type: 'string',
            enum: ['accept', 'tentativelyAccept', 'decline'],
            'x-ms-enum-values': [
              {
                displayName: 'Accept',
                value: 'accept',
              },
              {
                displayName: 'Tentatively Accept',
                value: 'tentativelyAccept',
              },
              {
                displayName: 'Decline',
                value: 'decline',
              },
            ],
          },
          {
            name: 'body',
            in: 'body',
            description: 'Event invite response body.',
            required: false,
            schema: {
              $ref: '#/definitions/ResponseToEventInvite',
            },
            'x-ms-summary': 'Event invite response body',
          },
        ],
        responses: {
          '202': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'RespondToEvent',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#respond-to-an-event-invite-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/api/v2.0/me/messages/{message_id}/forward': {
      post: {
        summary: 'Forward an email',
        description: 'Forward an email.',
        operationId: 'ForwardEmail',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'message_id',
            in: 'path',
            description: 'Id of the message to forward.',
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'body',
            in: 'body',
            description: 'Direct forward message.',
            required: true,
            schema: {
              $ref: '#/definitions/DirectForwardMessage',
            },
            'x-ms-summary': 'Direct forward message',
          },
        ],
        responses: {
          '202': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'ForwardEmail',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#forward-an-email-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/messages/{message_id}/forward': {
      post: {
        summary: 'Forward an email (V2)',
        description: 'Forward an email.',
        operationId: 'ForwardEmail_V2',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'message_id',
            in: 'path',
            description: "Id of the message to forward. (You can use 'Message Id' from trigger or 'Get Emails' action output)",
            required: true,
            'x-ms-summary': 'Message Id',
            type: 'string',
          },
          {
            name: 'mailboxAddress',
            in: 'query',
            description: 'Address of the shared mailbox to forward mail from.',
            required: false,
            'x-ms-summary': 'Original Mailbox Address',
            'x-ms-dynamic-values': {
              builtInOperation: 'AadGraph.GetUsers',
              parameters: {},
              'value-path': 'mail',
            },
            type: 'string',
          },
          {
            name: 'body',
            in: 'body',
            description: 'Direct forward message.',
            required: true,
            schema: {
              $ref: '#/definitions/DirectForwardMessage',
            },
            'x-ms-summary': 'Direct forward message',
          },
        ],
        responses: {
          '202': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ForwardEmail',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#forward-an-email-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/api/beta/me/findroomlists': {
      get: {
        summary: 'Get room lists',
        description: "Get all the room lists defined in the user's tenant",
        operationId: 'GetRoomLists',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                value: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      Name: {
                        type: 'string',
                        description: 'Name',
                        'x-ms-summary': 'Name',
                      },
                      Address: {
                        type: 'string',
                        description: 'Address',
                        'x-ms-summary': 'Address',
                      },
                    },
                  },
                  description: 'value',
                  'x-ms-summary': 'value',
                },
              },
            },
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'GetRoomLists',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-room-lists-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/codeless/beta/me/findRoomLists': {
      get: {
        summary: 'Get room lists (V2)',
        description: "Get all the room lists defined in the user's tenant",
        operationId: 'GetRoomLists_V2',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                value: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Name',
                        'x-ms-summary': 'Name',
                      },
                      address: {
                        type: 'string',
                        description: 'Address',
                        'x-ms-summary': 'Address',
                      },
                    },
                  },
                  description: 'value',
                  'x-ms-summary': 'value',
                },
              },
            },
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetRoomLists',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-room-lists-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/api/beta/me/findrooms': {
      get: {
        summary: 'Get rooms',
        description: "Get all the meeting rooms defined in the user's tenant",
        operationId: 'GetRooms',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                value: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      Name: {
                        type: 'string',
                        description: 'Name',
                        'x-ms-summary': 'Name',
                      },
                      Address: {
                        type: 'string',
                        description: 'Address',
                        'x-ms-summary': 'Address',
                      },
                    },
                  },
                  description: 'value',
                  'x-ms-summary': 'value',
                },
              },
            },
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'GetRooms',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-rooms-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/codeless/beta/me/findRooms': {
      get: {
        summary: 'Get rooms (V2)',
        description: "Get all the meeting rooms defined in the user's tenant",
        operationId: 'GetRooms_V2',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                value: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Name',
                        'x-ms-summary': 'Name',
                      },
                      address: {
                        type: 'string',
                        description: 'Address',
                        'x-ms-summary': 'Address',
                      },
                    },
                  },
                  description: 'value',
                  'x-ms-summary': 'value',
                },
              },
            },
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetRooms',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-rooms-(v2)',
        },
      },
    },
    "/{connectionId}/codeless/api/beta/me/findrooms(roomlist='{room_list}')": {
      get: {
        summary: 'Get rooms in room list',
        description: 'Get the meeting rooms in a specific room list',
        operationId: 'GetRoomsInRoomList',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'room_list',
            in: 'path',
            description: 'Room list to find rooms in',
            'x-ms-summary': 'Room list',
            required: true,
            'x-ms-dynamic-values': {
              operationId: 'GetRoomLists_V2',
              'value-collection': 'value',
              'value-path': 'Address',
              'value-title': 'Name',
            },
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                value: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      Name: {
                        type: 'string',
                        description: 'Name',
                        'x-ms-summary': 'Name',
                      },
                      Address: {
                        type: 'string',
                        description: 'Address',
                        'x-ms-summary': 'Address',
                      },
                    },
                  },
                  description: 'value',
                  'x-ms-summary': 'value',
                },
              },
            },
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'GetRoomsInRoomList',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-rooms-in-room-list-%5bdeprecated%5d',
        },
      },
    },
    "/{connectionId}/codeless/beta/me/findRooms(RoomList='{room_list}')": {
      get: {
        summary: 'Get rooms in room list (V2)',
        description: 'Get the meeting rooms in a specific room list',
        operationId: 'GetRoomsInRoomList_V2',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'room_list',
            in: 'path',
            description: 'Room list to find rooms in',
            'x-ms-summary': 'Room list',
            required: true,
            'x-ms-dynamic-values': {
              operationId: 'GetRoomLists_V2',
              'value-collection': 'value',
              'value-path': 'address',
              'value-title': 'name',
            },
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                value: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Name',
                        'x-ms-summary': 'Name',
                      },
                      address: {
                        type: 'string',
                        description: 'Address',
                        'x-ms-summary': 'Address',
                      },
                    },
                  },
                  description: 'value',
                  'x-ms-summary': 'value',
                },
              },
            },
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetRoomsInRoomList',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-rooms-in-room-list-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/api/v2.0/me/findmeetingtimes': {
      post: {
        summary: 'Find meeting times',
        description: 'Find meeting time suggestions based on organizer, attendee availability, and time or location constraints',
        operationId: 'FindMeetingTimes',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'body',
            in: 'body',
            required: true,
            schema: {
              type: 'object',
              properties: {
                RequiredAttendees: {
                  type: 'string',
                  description: 'List of semicolon separated email addresses',
                  'x-ms-summary': 'Required attendees',
                },
                OptionalAttendees: {
                  type: 'string',
                  description: 'List of semicolon separated email addresses',
                  'x-ms-summary': 'Optional attendees',
                },
                ResourceAttendees: {
                  type: 'string',
                  description: 'Resource attendees for the event separated by semicolons',
                  'x-ms-summary': 'Resource attendees',
                },
                MeetingDuration: {
                  type: 'integer',
                  format: 'int32',
                  description: 'Duration of the meeting in minutes',
                  'x-ms-summary': 'Meeting duration',
                },
                Start: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Start time for meeting time suggestions',
                  'x-ms-summary': 'Start time',
                },
                End: {
                  type: 'string',
                  format: 'date-time',
                  description: 'End time for meeting time suggestions',
                  'x-ms-summary': 'End time',
                },
                MaxCandidates: {
                  type: 'integer',
                  format: 'int32',
                  description: 'The maximum number of meeting suggestions to return in the response',
                  'x-ms-summary': 'Max Candidates',
                  'x-ms-visibility': 'advanced',
                },
                MinimumAttendeePercentage: {
                  type: 'string',
                  description: 'The minimum required confidence for a time slot to be returned in the response',
                  'x-ms-summary': 'Minimum Attendee Percentage',
                  'x-ms-visibility': 'advanced',
                },
                IsOrganizerOptional: {
                  type: 'boolean',
                  description: "true if the organizer doesn't have to attend. The default is false",
                  'x-ms-summary': 'Is Organizer Optional?',
                  'x-ms-visibility': 'advanced',
                },
                ActivityDomain: {
                  type: 'string',
                  description: 'Work, Personal, Unrestricted, or Unknown',
                  'x-ms-summary': 'Activity Domain',
                  'x-ms-visibility': 'advanced',
                  default: 'Work',
                  enum: ['Work', 'Personal', 'Unrestricted', 'Unknown'],
                },
              },
            },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                EmptySuggestionsReason: {
                  type: 'string',
                  description: 'Empty Suggestions Reason',
                  'x-ms-summary': 'Empty Suggestions Reason',
                },
                MeetingTimeSuggestions: {
                  $ref: '#/definitions/MeetingTimeSuggestions',
                },
              },
            },
          },
        },
        deprecated: true,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'FindMeetingTimes',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#find-meeting-times-%5bdeprecated%5d',
        },
      },
    },
    '/{connectionId}/codeless/beta/me/findMeetingTimes': {
      post: {
        summary: 'Find meeting times (V2)',
        description: 'Find meeting time suggestions based on organizer, attendee availability, and time or location constraints',
        operationId: 'FindMeetingTimes_V2',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'body',
            in: 'body',
            required: true,
            schema: {
              type: 'object',
              properties: {
                RequiredAttendees: {
                  type: 'string',
                  description: 'List of semicolon separated email addresses',
                  'x-ms-summary': 'Required attendees',
                },
                OptionalAttendees: {
                  type: 'string',
                  description: 'List of semicolon separated email addresses',
                  'x-ms-summary': 'Optional attendees',
                },
                ResourceAttendees: {
                  type: 'string',
                  description: 'Resource attendees for the event separated by semicolons',
                  'x-ms-summary': 'Resource attendees',
                },
                MeetingDuration: {
                  type: 'integer',
                  format: 'int32',
                  description: 'Duration of the meeting in minutes',
                  'x-ms-summary': 'Meeting duration',
                },
                Start: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Start time for meeting time suggestions',
                  'x-ms-summary': 'Start time',
                },
                End: {
                  type: 'string',
                  format: 'date-time',
                  description: 'End time for meeting time suggestions',
                  'x-ms-summary': 'End time',
                },
                MaxCandidates: {
                  type: 'integer',
                  format: 'int32',
                  description: 'The maximum number of meeting suggestions to return in the response',
                  'x-ms-summary': 'Max Candidates',
                  'x-ms-visibility': 'advanced',
                },
                MinimumAttendeePercentage: {
                  type: 'string',
                  description: 'The minimum required confidence for a time slot to be returned in the response',
                  'x-ms-summary': 'Minimum Attendee Percentage',
                  'x-ms-visibility': 'advanced',
                },
                IsOrganizerOptional: {
                  type: 'boolean',
                  description: "true if the organizer doesn't have to attend. The default is false",
                  'x-ms-summary': 'Is Organizer Optional?',
                  'x-ms-visibility': 'advanced',
                },
                ActivityDomain: {
                  type: 'string',
                  description: 'Work, Personal, Unrestricted, or Unknown',
                  'x-ms-summary': 'Activity Domain',
                  'x-ms-visibility': 'advanced',
                  default: 'Work',
                  enum: ['Work', 'Personal', 'Unrestricted', 'Unknown'],
                },
              },
            },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                emptySuggestionsReason: {
                  type: 'string',
                  description: 'Empty Suggestions Reason',
                  'x-ms-summary': 'Empty Suggestions Reason',
                },
                meetingTimeSuggestions: {
                  $ref: '#/definitions/MeetingTimeSuggestions_V2',
                },
              },
            },
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'FindMeetingTimes',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#find-meeting-times-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/mailboxSettings': {
      patch: {
        tags: ['MailboxSettings'],
        summary: 'Set up automatic replies (V2)',
        description: 'Set the automatic replies setting for your mailbox.',
        operationId: 'SetAutomaticRepliesSetting_V2',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'body',
            in: 'body',
            description: 'Settings.',
            required: true,
            schema: {
              type: 'object',
              properties: {
                automaticRepliesSetting: {
                  $ref: '#/definitions/AutomaticRepliesSettingClient_V2',
                },
              },
            },
            'x-ms-summary': 'Settings',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                automaticRepliesSetting: {
                  $ref: '#/definitions/AutomaticRepliesSettingClient_V2',
                },
              },
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'SetAutomaticRepliesSetting',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#set-up-automatic-replies-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/getMailTips': {
      post: {
        tags: ['MailboxSettings'],
        summary: 'Get mail tips for a mailbox (V2)',
        description:
          'Get mail tips for a mailbox such as automatic replies / OOF message or if the mailbox is full. This is not available in GccHigh and Mooncake.',
        operationId: 'GetMailTips_V2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'body',
            in: 'body',
            required: true,
            schema: {
              type: 'object',
              required: ['MailTipsOptions', 'EmailAddresses'],
              properties: {
                MailTipsOptions: {
                  type: 'string',
                  default:
                    'automaticReplies, deliveryRestriction, externalMemberCount, mailboxFullStatus, maxMessageSize, moderationStatus, totalMemberCount',
                  description: 'Flags that represents the mailtips.',
                  'x-ms-visibility': 'internal',
                  'x-ms-summary': 'Flags that represents the mailtips.',
                },
                EmailAddresses: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Address of the mailbox to get mail tips for.',
                  'x-ms-summary': 'Email Addresses',
                },
              },
            },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                value: {
                  type: 'array',
                  items: {
                    $ref: '#/definitions/MailTipsClientReceive_V2',
                  },
                },
              },
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'GetMailTips',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-mail-tips-for-a-mailbox-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/calendars': {
      get: {
        summary: 'Get calendars (V2)',
        description: 'This operation lists available calendars.',
        operationId: 'CalendarGetTables_V2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'skip',
            in: 'query',
            description: 'Number of calendars to skip.',
            required: false,
            'x-ms-summary': 'Skip',
            type: 'integer',
            format: 'int32',
            default: 0,
            'x-ms-visibility': 'internal',
          },
          {
            name: 'top',
            in: 'query',
            description: 'Calendar page size.',
            required: false,
            'x-ms-summary': 'Top',
            type: 'integer',
            format: 'int32',
            default: 256,
            'x-ms-visibility': 'internal',
          },
          {
            name: 'orderBy',
            in: 'query',
            description: 'Orders calendars.',
            required: false,
            'x-ms-summary': 'Order By',
            type: 'string',
            default: 'name',
            'x-ms-visibility': 'internal',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              properties: {
                value: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'The id of the calendar. The id is used at runtime.',
                        'x-ms-summary': 'ID',
                      },
                      name: {
                        type: 'string',
                        description: 'The display name of the calendar.',
                        'x-ms-summary': 'Name',
                      },
                      owner: {
                        $ref: '#/definitions/EmailAddress_V2',
                      },
                    },
                  },
                  description: 'value',
                  'x-ms-summary': 'value',
                },
              },
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarGetTables',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-calendars-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/calendars/{calendar}/events/{event}': {
      delete: {
        summary: 'Delete event (V2)',
        description: 'This operation deletes an event in a calendar.',
        operationId: 'CalendarDeleteItem_V2',
        consumes: [],
        produces: ['text/plain'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'calendar',
            in: 'path',
            description: 'Select a calendar',
            required: true,
            'x-ms-summary': 'Calendar id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'CalendarGetTables_V2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'name',
            },
            type: 'string',
          },
          {
            name: 'event',
            in: 'path',
            description: 'Select an event',
            required: true,
            'x-ms-summary': 'Id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '204': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'CalendarDeleteItem',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#delete-event-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts/{id}': {
      get: {
        summary: 'Get contact (V2)',
        description: 'This operation gets a specific contact from a contacts folder.',
        operationId: 'ContactGetItem_V2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folder',
            in: 'path',
            description: 'Select a contacts folder',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTablesV2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'displayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Unique identifier of a contact to retrieve',
            required: true,
            'x-ms-summary': 'Item id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/ContactResponse_V2',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactGetItem',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-contact-(v2)',
        },
      },
      delete: {
        summary: 'Delete contact (V2)',
        description: 'This operation deletes a contact from a contacts folder.',
        operationId: 'ContactDeleteItem_V2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folder',
            in: 'path',
            description: 'Select a contacts folder',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTablesV2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'displayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Unique identifier of contact to delete',
            required: true,
            'x-ms-summary': 'Id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
        ],
        responses: {
          '204': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactDeleteItem',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#delete-contact-(v2)',
        },
      },
      patch: {
        summary: 'Update contact (V2)',
        description: 'This operation updates a contact in a contacts folder.',
        operationId: 'ContactPatchItem_V2',
        consumes: ['application/json', 'text/json'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folder',
            in: 'path',
            description: 'Select a contacts folder',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTablesV2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'displayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Unique identifier of contact to update',
            required: true,
            'x-ms-summary': 'Id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Contact item to update',
            required: true,
            schema: {
              $ref: '#/definitions/Contact_V2',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/ContactResponse_V2',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactPatchItem',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#update-contact-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts': {
      get: {
        summary: 'Get contacts (V2)',
        description: 'This operation gets contacts from a contacts folder.',
        operationId: 'ContactGetItems_V2',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folder',
            in: 'path',
            description: 'Unique identifier of the contacts folder to retrieve',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTablesV2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'displayName',
            },
            type: 'string',
          },
          {
            name: '$filter',
            in: 'query',
            description: "An ODATA filter query to restrict the entries returned (e.g. stringColumn eq 'string' OR numberColumn lt 123).",
            required: false,
            'x-ms-summary': 'Filter Query',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$orderby',
            in: 'query',
            description: 'An ODATA orderBy query for specifying the order of entries.',
            required: false,
            'x-ms-summary': 'Order By',
            'x-ms-visibility': 'advanced',
            type: 'string',
          },
          {
            name: '$top',
            in: 'query',
            description: 'Total number of entries to retrieve (default = all).',
            required: false,
            'x-ms-summary': 'Top Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
          {
            name: '$skip',
            in: 'query',
            description: 'The number of entries to skip (default = 0).',
            required: false,
            'x-ms-summary': 'Skip Count',
            'x-ms-visibility': 'advanced',
            type: 'integer',
            format: 'int32',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/EntityListResponse[ContactResponse]_V2',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactGetItems',
          revision: 2,
        },
        'x-ms-pageable': {
          nextLinkName: '@odata.nextLink',
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#get-contacts-(v2)',
        },
      },
      post: {
        summary: 'Create contact (V2)',
        description: 'This operation creates a new contact in a contacts folder.',
        operationId: 'ContactPostItem_V2',
        consumes: ['application/json', 'text/json'],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folder',
            in: 'path',
            description: 'Select a contacts folder',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTablesV2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'displayName',
            },
            type: 'string',
          },
          {
            name: 'item',
            in: 'body',
            description: 'Contact to create',
            required: true,
            schema: {
              $ref: '#/definitions/Contact_V2',
            },
            'x-ms-summary': 'Item',
          },
        ],
        responses: {
          '201': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/ContactResponse_V2',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'important',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ContactPostItem',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#create-contact-(v2)',
        },
      },
    },
    '/{connectionId}/codeless/v1.0/me/contactFolders/{folder}/contacts/{id}/photo/$value': {
      put: {
        summary: "Update my contact's photo",
        description: 'Updates the photo of the specified contact of the current user. The size of the photo must be less than 4 MB.',
        operationId: 'UpdateMyContactPhoto',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'folder',
            in: 'path',
            description: 'Select a contacts folder',
            required: true,
            'x-ms-summary': 'Folder id',
            'x-ms-url-encoding': 'double',
            'x-ms-dynamic-values': {
              operationId: 'ContactGetTablesV2',
              parameters: {},
              'value-collection': 'value',
              'value-path': 'id',
              'value-title': 'displayName',
            },
            type: 'string',
          },
          {
            name: 'id',
            in: 'path',
            description: 'Unique identifier of a contact to update photo',
            required: true,
            'x-ms-summary': 'Item id',
            'x-ms-url-encoding': 'double',
            type: 'string',
          },
          {
            name: 'body',
            in: 'body',
            schema: {
              type: 'string',
              format: 'binary',
            },
            required: true,
            description: 'Image content',
            'x-ms-summary': 'Image content',
          },
          {
            name: 'Content-Type',
            in: 'header',
            type: 'string',
            default: 'image/jpeg',
            required: false,
            description: "Image content type (like 'image/jpeg')",
            'x-ms-summary': 'Content-Type',
            'x-ms-visibility': 'internal',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'advanced',
        'x-ms-api-annotation': {
          status: 'Production',
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#update-my-contact%27s-photo',
        },
      },
    },
    '/{connectionId}/codeless/httprequest': {
      post: {
        summary: 'Send an HTTP request',
        description:
          'Construct a Microsoft Graph REST API request to invoke. These segments are supported: 1st segement: /me, /users/<userId> 2nd segment: messages, mailFolders, events, calendar, calendars, outlook, inferenceClassification. Learn more: https://docs.microsoft.com/en-us/graph/use-the-api.',
        operationId: 'HttpRequest',
        consumes: [],
        produces: [],
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            name: 'Uri',
            in: 'header',
            description: 'The full or relative URI. Example: https://graph.microsoft.com/{version}/{resource}.',
            required: true,
            'x-ms-summary': 'URI',
            type: 'string',
          },
          {
            name: 'Method',
            in: 'header',
            description: 'The HTTP method (default is GET).',
            default: 'GET',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            required: true,
            'x-ms-summary': 'Method',
            type: 'string',
          },
          {
            name: 'Body',
            in: 'body',
            description: 'The request body content.',
            required: false,
            schema: {
              format: 'binary',
              type: 'string',
            },
            'x-ms-summary': 'Body',
          },
          {
            name: 'ContentType',
            in: 'header',
            description: 'The content-type header for the body (default is application/json).',
            required: false,
            'x-ms-summary': 'Content-Type',
            type: 'string',
            default: 'application/json',
          },
          {
            name: 'CustomHeader1',
            in: 'header',
            description: 'Custom header 1. Specify in format: header-name: header-value',
            required: false,
            'x-ms-summary': 'CustomHeader1',
            type: 'string',
            'x-ms-visibility': 'advanced',
          },
          {
            name: 'CustomHeader2',
            in: 'header',
            description: 'Custom header 2. Specify in format: header-name: header-value',
            required: false,
            'x-ms-summary': 'CustomHeader2',
            type: 'string',
            'x-ms-visibility': 'advanced',
          },
          {
            name: 'CustomHeader3',
            in: 'header',
            description: 'Custom header 3. Specify in format: header-name: header-value',
            required: false,
            'x-ms-summary': 'CustomHeader3',
            type: 'string',
            'x-ms-visibility': 'advanced',
          },
          {
            name: 'CustomHeader4',
            in: 'header',
            description: 'Custom header 4. Specify in format: header-name: header-value',
            required: false,
            'x-ms-summary': 'CustomHeader4',
            type: 'string',
            'x-ms-visibility': 'advanced',
          },
          {
            name: 'CustomHeader5',
            in: 'header',
            description: 'Custom header 5. Specify in format: header-name: header-value',
            required: false,
            'x-ms-summary': 'CustomHeader5',
            type: 'string',
            'x-ms-visibility': 'advanced',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              $ref: '#/definitions/ObjectWithoutType',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        'x-ms-visibility': 'important',
        'x-ms-api-annotation': {
          status: 'Preview',
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#send-an-http-request',
        },
      },
    },
    '/RecordResponse': {
      get: {
        tags: ['RecordResponse'],
        summary: 'Receives response from user',
        description: 'This operation gets a response from the user.',
        operationId: 'ReceiveResponseGet',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'state',
            in: 'query',
            description: 'callback state.',
            required: true,
            'x-ms-summary': 'callback state',
            type: 'string',
          },
          {
            name: 'sig',
            in: 'query',
            required: false,
            type: 'string',
          },
          {
            name: 'showConfirm',
            in: 'query',
            description: 'showConfirm query parameter, if true, then confirmation page will be returned.',
            required: false,
            'x-ms-summary': 'showConfirm query parameter, if true, then confirmation page will be returned',
            type: 'boolean',
            default: false,
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'string',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        security: [],
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#receives-response-from-user',
        },
      },
      post: {
        tags: ['RecordResponse'],
        summary: 'Receives response from user',
        description: 'This operation gets a response from the user.',
        operationId: 'ReceiveResponsePost',
        consumes: [],
        produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
        parameters: [
          {
            name: 'state',
            in: 'query',
            description: 'callback state.',
            required: true,
            'x-ms-summary': 'callback state',
            type: 'string',
          },
          {
            name: 'sig',
            in: 'query',
            required: false,
            type: 'string',
          },
          {
            name: 'fromConfirm',
            in: 'query',
            description: 'fromConfirm query parameter, if true, then request is from confirmation page.',
            required: false,
            'x-ms-summary': 'fromConfirm query parameter, if true, then request is from confirmation page',
            type: 'boolean',
            default: false,
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'string',
            },
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        security: [],
        'x-ms-visibility': 'internal',
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#receives-response-from-user',
        },
      },
    },
    '/MailSubscriptionReceive': {
      post: {
        tags: ['SubscriptionPayload'],
        summary: 'Receive mail',
        description: 'This operation validates the subscription request.',
        operationId: 'ReceiveMailFromSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'state',
            in: 'query',
            description: 'Callback state.',
            required: true,
            'x-ms-summary': 'Callback state',
            type: 'string',
          },
          {
            name: 'subscriptionPayload',
            in: 'body',
            description: 'Subscription payload.',
            required: true,
            schema: {
              $ref: '#/definitions/SubscriptionPayload[OutlookReceiveMessage]',
            },
            'x-ms-summary': 'Subscription payload',
          },
          {
            name: 'validationtoken',
            in: 'query',
            description: 'Validation token.',
            required: false,
            'x-ms-summary': 'Validation token',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        security: [],
        'x-ms-visibility': 'internal',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ReceiveMailFromSubscription',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#receive-mail',
        },
      },
    },
    '/{subscribedConnectionId}/MailSubscriptionReceive': {
      post: {
        tags: ['SubscriptionPayload'],
        summary: 'Receive mail (V2)',
        description: 'This operation validates the subscription request.',
        operationId: 'ReceiveMailFromSubscriptionV2',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'state',
            in: 'query',
            description: 'Callback state.',
            required: true,
            'x-ms-summary': 'Callback state',
            type: 'string',
          },
          {
            name: 'subscriptionPayload',
            in: 'body',
            description: 'Subscription payload.',
            required: true,
            schema: {
              $ref: '#/definitions/SubscriptionPayload[OutlookReceiveMessage]',
            },
            'x-ms-summary': 'Subscription payload',
          },
          {
            name: 'validationtoken',
            in: 'query',
            description: 'Validation token.',
            required: false,
            'x-ms-summary': 'Validation token',
            type: 'string',
          },
          {
            name: 'subscribedConnectionId',
            in: 'path',
            required: true,
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        security: [],
        'x-ms-visibility': 'internal',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'ReceiveMailFromSubscription',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#receive-mail-(v2)',
        },
      },
    },
    '/EventSubscriptionReceive': {
      post: {
        tags: ['SubscriptionPayload'],
        summary: 'Receive event',
        description: 'This operation validates the subscription request.',
        operationId: 'ReceiveEventFromSubscription',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'state',
            in: 'query',
            description: 'Callback state.',
            required: true,
            'x-ms-summary': 'Callback state',
            type: 'string',
          },
          {
            name: 'subscriptionPayload',
            in: 'body',
            description: 'Subscription payload.',
            required: true,
            schema: {
              $ref: '#/definitions/SubscriptionPayload[SubscriptionEvent]',
            },
            'x-ms-summary': 'Subscription payload',
          },
          {
            name: 'validationtoken',
            in: 'query',
            description: 'Validation token.',
            required: false,
            'x-ms-summary': 'Validation token',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        security: [],
        'x-ms-visibility': 'internal',
        'x-ms-api-annotation': {
          status: 'Production',
          family: 'ReceiveEventFromSubscription',
          revision: 1,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#receive-event',
        },
      },
    },
    '/{subscribedConnectionId}/EventSubscriptionReceive': {
      post: {
        tags: ['SubscriptionPayload'],
        summary: 'Receive event (V2)',
        description: 'This operation validates the subscription request.',
        operationId: 'ReceiveEventFromSubscriptionV2',
        consumes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'application/x-www-form-urlencoded'],
        produces: [],
        parameters: [
          {
            name: 'state',
            in: 'query',
            description: 'Callback state.',
            required: true,
            'x-ms-summary': 'Callback state',
            type: 'string',
          },
          {
            name: 'subscriptionPayload',
            in: 'body',
            description: 'Subscription payload.',
            required: true,
            schema: {
              $ref: '#/definitions/SubscriptionPayload[SubscriptionEvent]',
            },
            'x-ms-summary': 'Subscription payload',
          },
          {
            name: 'validationtoken',
            in: 'query',
            description: 'Validation token.',
            required: false,
            'x-ms-summary': 'Validation token',
            type: 'string',
          },
          {
            name: 'subscribedConnectionId',
            in: 'path',
            required: true,
            type: 'string',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
          },
          default: {
            description: 'Operation Failed.',
          },
        },
        deprecated: false,
        security: [],
        'x-ms-visibility': 'internal',
        'x-ms-api-annotation': {
          status: 'Preview',
          family: 'ReceiveEventFromSubscription',
          revision: 2,
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/office365/#receive-event-(v2)',
        },
      },
    },
  },
  definitions: {
    TableMetadata: {
      description: 'Table metadata',
      type: 'object',
      properties: {
        name: {
          description: 'Table name',
          type: 'string',
        },
        title: {
          description: 'Table title',
          type: 'string',
        },
        'x-ms-permission': {
          description: 'Table permission',
          type: 'string',
        },
        'x-ms-capabilities': {
          $ref: '#/definitions/TableCapabilitiesMetadata',
        },
        schema: {
          $ref: '#/definitions/Object',
        },
        referencedEntities: {
          $ref: '#/definitions/Object',
        },
        webUrl: {
          description: 'Url link',
          type: 'string',
        },
      },
    },
    TableCapabilitiesMetadata: {
      description: 'Metadata for a table (capabilities)',
      type: 'object',
      properties: {
        sortRestrictions: {
          $ref: '#/definitions/TableSortRestrictionsMetadata',
        },
        filterRestrictions: {
          $ref: '#/definitions/TableFilterRestrictionsMetadata',
        },
        selectRestrictions: {
          $ref: '#/definitions/TableSelectRestrictionsMetadata',
        },
        isOnlyServerPagable: {
          description: 'Server paging restrictions',
          type: 'boolean',
        },
        filterFunctionSupport: {
          description: 'List of supported filter capabilities',
          type: 'array',
          items: {
            enum: [
              'eq',
              'ne',
              'gt',
              'ge',
              'lt',
              'le',
              'and',
              'or',
              'contains',
              'startswith',
              'endswith',
              'length',
              'indexof',
              'replace',
              'substring',
              'substringof',
              'tolower',
              'toupper',
              'trim',
              'concat',
              'year',
              'month',
              'day',
              'hour',
              'minute',
              'second',
              'date',
              'time',
              'now',
              'totaloffsetminutes',
              'totalseconds',
              'floor',
              'ceiling',
              'round',
              'not',
              'negate',
              'add',
              'sub',
              'mul',
              'div',
              'mod',
              'sum',
              'min',
              'max',
              'average',
              'countdistinct',
              'null',
            ],
            type: 'string',
          },
        },
        serverPagingOptions: {
          description: 'List of supported server-driven paging capabilities',
          type: 'array',
          items: {
            enum: ['top', 'skiptoken'],
            type: 'string',
          },
        },
      },
    },
    Object: {
      type: 'object',
      properties: {},
    },
    TableSortRestrictionsMetadata: {
      description: 'Metadata for a table (sort restrictions)',
      type: 'object',
      properties: {
        sortable: {
          description: 'Indicates whether this table has sortable columns',
          type: 'boolean',
        },
        unsortableProperties: {
          description: 'List of unsortable properties',
          type: 'array',
          items: {
            type: 'string',
          },
        },
        ascendingOnlyProperties: {
          description: 'List of properties which support ascending order only',
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
    TableFilterRestrictionsMetadata: {
      description: 'Metadata for a table (filter restrictions)',
      type: 'object',
      properties: {
        filterable: {
          description: 'Indicates whether this table has filterable columns',
          type: 'boolean',
        },
        nonFilterableProperties: {
          description: 'List of non filterable properties',
          type: 'array',
          items: {
            type: 'string',
          },
        },
        requiredProperties: {
          description: 'List of required properties',
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
    TableSelectRestrictionsMetadata: {
      description: 'Metadata for a table (select restrictions)',
      type: 'object',
      properties: {
        selectable: {
          description: 'Indicates whether this table has selectable columns',
          type: 'boolean',
        },
      },
    },
    CalendarEventList: {
      description: 'The list of calendar items',
      type: 'object',
      properties: {
        value: {
          description: 'List of calendar items',
          type: 'array',
          items: {
            $ref: '#/definitions/CalendarEventBackend',
          },
        },
      },
    },
    CalendarEventBackend: {
      description: 'Connector specific calendar event model class for the backend',
      required: ['End', 'Start', 'Subject'],
      type: 'object',
      properties: {
        Id: {
          description: "The Event's unique identifier",
          type: 'string',
          'x-ms-summary': 'Id',
        },
        Attendees: {
          description: 'List of attendees for the event',
          type: 'array',
          items: {
            $ref: '#/definitions/Attendee',
          },
          'x-ms-summary': 'Attendees',
        },
        Body: {
          $ref: '#/definitions/ItemBody',
        },
        BodyPreview: {
          description: 'The preview of the message associated with the event',
          type: 'string',
          'x-ms-summary': 'Body preview',
          'x-ms-visibility': 'advanced',
        },
        Categories: {
          description: 'The categories associated with the event',
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Categories',
          'x-ms-visibility': 'advanced',
        },
        ChangeKey: {
          description:
            'This property identifies the version of the event object. Every time the event is changed, ChangeKey changes as well.',
          type: 'string',
          'x-ms-summary': 'Change key',
          'x-ms-visibility': 'advanced',
        },
        DateTimeCreated: {
          format: 'date-time',
          description: 'The date and time that the event was created',
          type: 'string',
          'x-ms-summary': 'Created time',
          'x-ms-visibility': 'advanced',
        },
        DateTimeLastModified: {
          format: 'date-time',
          description: 'The date and time that the event was last modified',
          type: 'string',
          'x-ms-summary': 'Last modified time',
          'x-ms-visibility': 'advanced',
        },
        End: {
          format: 'date-time',
          description: 'The end time of the event',
          type: 'string',
          'x-ms-summary': 'End time',
        },
        EndTimeZone: {
          description:
            "This property specifies the time zone of the meeting end time. The value must be as defined in Windows (example: 'Pacific Standard Time').",
          type: 'string',
          'x-ms-summary': 'End time zone',
          'x-ms-visibility': 'advanced',
        },
        HasAttachments: {
          description: 'Set to true if the event has attachments',
          type: 'boolean',
          'x-ms-summary': 'Has attachments?',
          'x-ms-visibility': 'advanced',
        },
        ICalUId: {
          description: 'A unique identifier that is shared by all instances of an event across different calendars',
          type: 'string',
          'x-ms-summary': 'Event Unique ID',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          description: 'The importance of the event: Low, Normal, or High',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        IsAllDay: {
          description: 'Set to true if the event lasts all day',
          type: 'boolean',
          'x-ms-summary': 'Is all day event?',
          'x-ms-visibility': 'advanced',
        },
        IsCancelled: {
          description: 'Set to true if the event has been canceled',
          type: 'boolean',
          'x-ms-summary': 'Is cancelled?',
          'x-ms-visibility': 'advanced',
        },
        IsOrganizer: {
          description: 'Set to true if the message sender is also the organizer',
          type: 'boolean',
          'x-ms-summary': 'Is Organizer',
          'x-ms-visibility': 'advanced',
        },
        Location: {
          $ref: '#/definitions/Location',
        },
        Organizer: {
          $ref: '#/definitions/Recipient',
        },
        Recurrence: {
          $ref: '#/definitions/PatternedRecurrence',
        },
        Reminder: {
          format: 'int32',
          description: 'Time in minutes before event start to remind',
          type: 'integer',
          'x-ms-summary': 'Reminder',
          'x-ms-visibility': 'advanced',
        },
        ResponseRequested: {
          description: 'Set to true if the sender would like a response when the event is accepted or declined',
          type: 'boolean',
          'x-ms-summary': 'Response requested',
          'x-ms-visibility': 'advanced',
        },
        ResponseStatus: {
          $ref: '#/definitions/ResponseStatus',
        },
        SeriesMasterId: {
          description: 'Unique identifier for Series Master event type',
          type: 'string',
          'x-ms-summary': 'Series master id',
          'x-ms-visibility': 'advanced',
        },
        ShowAs: {
          description: 'Shows as free or busy',
          enum: ['Free', 'Tentative', 'Busy', 'Oof', 'WorkingElsewhere', 'Unknown'],
          type: 'string',
          'x-ms-summary': 'Show as',
          'x-ms-visibility': 'advanced',
        },
        Start: {
          format: 'date-time',
          description: 'The start time of the event',
          type: 'string',
          'x-ms-summary': 'Start time',
        },
        StartTimeZone: {
          description:
            "This property specifies the time zone of the meeting start time. The value must be as defined in Windows (example: 'Pacific Standard Time').",
          type: 'string',
          'x-ms-summary': 'Start time zone',
          'x-ms-visibility': 'advanced',
        },
        Subject: {
          description: 'Event subject',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Type: {
          description: 'The event type: Single Instance, Occurrence, Exception, or Series Master',
          enum: ['SingleInstance', 'Occurrence', 'Exception', 'SeriesMaster'],
          type: 'string',
          'x-ms-summary': 'Type',
          'x-ms-visibility': 'advanced',
        },
        WebLink: {
          format: 'uri',
          description: 'The preview of the message associated with the event',
          type: 'string',
          'x-ms-summary': 'Web link',
          'x-ms-visibility': 'advanced',
        },
        Reason: {
          description: "The reason property used by O365 sync events protocol, will be 'deleted' if its a deleted event.",
          type: 'string',
          'x-ms-summary': 'Reason',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    Attendee: {
      type: 'object',
      properties: {
        Status: {
          $ref: '#/definitions/ResponseStatus',
        },
        Type: {
          enum: ['Required', 'Optional', 'Resource'],
          type: 'string',
        },
        EmailAddress: {
          $ref: '#/definitions/EmailAddress',
        },
      },
    },
    ItemBody: {
      type: 'object',
      properties: {
        ContentType: {
          enum: ['Text', 'HTML'],
          type: 'string',
        },
        Content: {
          type: 'string',
        },
      },
    },
    Location: {
      type: 'object',
      properties: {
        DisplayName: {
          type: 'string',
        },
        Address: {
          $ref: '#/definitions/PhysicalAddress',
        },
        Coordinates: {
          $ref: '#/definitions/GeoCoordinates',
        },
      },
    },
    Recipient: {
      type: 'object',
      properties: {
        EmailAddress: {
          $ref: '#/definitions/EmailAddress',
        },
      },
    },
    PatternedRecurrence: {
      type: 'object',
      properties: {
        Pattern: {
          $ref: '#/definitions/RecurrencePattern',
        },
        Range: {
          $ref: '#/definitions/RecurrenceRange',
        },
      },
    },
    ResponseStatus: {
      type: 'object',
      properties: {
        Response: {
          enum: ['None', 'Organizer', 'TentativelyAccepted', 'Accepted', 'Declined', 'NotResponded'],
          type: 'string',
        },
        Time: {
          format: 'date-time',
          type: 'string',
        },
      },
    },
    EmailAddress: {
      type: 'object',
      properties: {
        Name: {
          type: 'string',
        },
        Address: {
          type: 'string',
          format: 'email',
        },
      },
    },
    PhysicalAddress: {
      type: 'object',
      properties: {
        Street: {
          type: 'string',
        },
        City: {
          type: 'string',
        },
        State: {
          type: 'string',
        },
        CountryOrRegion: {
          type: 'string',
        },
        PostalCode: {
          type: 'string',
        },
      },
    },
    GeoCoordinates: {
      type: 'object',
      properties: {
        Altitude: {
          format: 'double',
          type: 'number',
        },
        Latitude: {
          format: 'double',
          type: 'number',
        },
        Longitude: {
          format: 'double',
          type: 'number',
        },
        Accuracy: {
          format: 'double',
          type: 'number',
        },
        AltitudeAccuracy: {
          format: 'double',
          type: 'number',
        },
      },
    },
    RecurrencePattern: {
      type: 'object',
      properties: {
        Type: {
          enum: ['Daily', 'Weekly', 'AbsoluteMonthly', 'RelativeMonthly', 'AbsoluteYearly', 'RelativeYearly'],
          type: 'string',
        },
        Interval: {
          format: 'int32',
          type: 'integer',
        },
        Month: {
          format: 'int32',
          type: 'integer',
        },
        DayOfMonth: {
          format: 'int32',
          type: 'integer',
        },
        DaysOfWeek: {
          type: 'array',
          items: {
            enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            type: 'string',
          },
        },
        FirstDayOfWeek: {
          enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          type: 'string',
        },
        Index: {
          enum: ['First', 'Second', 'Third', 'Fourth', 'Last'],
          type: 'string',
        },
      },
    },
    RecurrenceRange: {
      type: 'object',
      properties: {
        Type: {
          enum: ['EndDate', 'NoEnd', 'Numbered'],
          type: 'string',
        },
        StartDate: {
          format: 'date-time',
          type: 'string',
        },
        EndDate: {
          format: 'date-time',
          type: 'string',
        },
        NumberOfOccurrences: {
          format: 'int32',
          type: 'integer',
        },
      },
    },
    CalendarEventListClientReceive: {
      description: 'The list of calendar items',
      type: 'object',
      properties: {
        value: {
          description: 'List of calendar items',
          type: 'array',
          items: {
            $ref: '#/definitions/CalendarEventClientReceive',
          },
        },
      },
    },
    CalendarEventClientReceive: {
      description: 'Connector specific calendar event model class for the client',
      type: 'object',
      properties: {
        Subject: {
          description: 'Event subject',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Start: {
          format: 'date-time',
          description: "Start time of the event (example: '2016-11-01T14:30:00Z')",
          type: 'string',
          'x-ms-summary': 'Start time',
        },
        End: {
          format: 'date-time',
          description: "End time of the event (example: '2016-11-01T15:30:00Z')",
          type: 'string',
          'x-ms-summary': 'End time',
        },
        ShowAs: {
          format: 'int32',
          description: 'Status to show during the event (Unknown - -1, Free - 0, Tentative - 1, Busy - 2, Oof - 3, WorkingElsewhere - 4)',
          type: 'integer',
          'x-ms-summary': 'Show as',
          'x-ms-visibility': 'advanced',
        },
        Recurrence: {
          format: 'int32',
          description: 'The recurrence pattern for the event (None - 0, Daily - 1, Weekly - 2, Monthly - 3, Yearly - 4)',
          type: 'integer',
          'x-ms-summary': 'Recurrence',
          'x-ms-visibility': 'advanced',
        },
        ResponseType: {
          format: 'int32',
          description:
            'The response type of the event (None - 0, Organizer - 1, TentativelyAccepted - 2, Accepted - 3, Declined - 4, NotResponded - 5)',
          type: 'integer',
          'x-ms-summary': 'Response type',
          'x-ms-visibility': 'advanced',
        },
        ResponseTime: {
          format: 'date-time',
          description: 'The response time of the event',
          type: 'string',
          'x-ms-summary': 'Response time',
          'x-ms-visibility': 'advanced',
        },
        ICalUId: {
          description: 'A unique identifier that is shared by all instances of an event across different calendars',
          type: 'string',
          'x-ms-summary': 'Event Unique ID',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          format: 'int32',
          description: 'The importance of the event (0 - Low, 1 - Normal, 2 - High)',
          type: 'integer',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        Id: {
          description: "The event's unique identifier",
          type: 'string',
          'x-ms-summary': 'Id',
          'x-ms-visibility': 'advanced',
        },
        DateTimeCreated: {
          format: 'date-time',
          description: 'The date and time that the event was created',
          type: 'string',
          'x-ms-summary': 'Created time',
          'x-ms-visibility': 'advanced',
        },
        DateTimeLastModified: {
          format: 'date-time',
          description: 'The date and time that the event was last modified',
          type: 'string',
          'x-ms-summary': 'Last modified time',
          'x-ms-visibility': 'advanced',
        },
        Organizer: {
          format: 'email',
          description: 'The organizer of the event',
          type: 'string',
          'x-ms-summary': 'Organizer',
          'x-ms-visibility': 'advanced',
        },
        TimeZone: {
          description: 'Time zone of the event',
          type: 'string',
          'x-ms-summary': 'Time zone',
          'x-ms-visibility': 'advanced',
        },
        SeriesMasterId: {
          description: 'Unique identifier for Series Master event type',
          type: 'string',
          'x-ms-summary': 'Series master id',
          'x-ms-visibility': 'advanced',
        },
        Categories: {
          description: 'The categories associated with the event',
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Categories',
          'x-ms-visibility': 'advanced',
        },
        WebLink: {
          format: 'uri',
          description: 'The URL to open the event in Outlook Web App',
          type: 'string',
          'x-ms-summary': 'Web link',
          'x-ms-visibility': 'advanced',
        },
        RequiredAttendees: {
          format: 'email',
          description: 'Required attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Required attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        OptionalAttendees: {
          format: 'email',
          description: 'Optional attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Optional attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        ResourceAttendees: {
          description: 'Resource attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Resource attendees',
          'x-ms-visibility': 'advanced',
        },
        Body: {
          description: 'Body of the message associated with the event',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'advanced',
        },
        IsHtml: {
          description: 'Set to true if the body is Html',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
        Location: {
          description: 'Location of the event',
          type: 'string',
          'x-ms-summary': 'Location',
          'x-ms-visibility': 'advanced',
        },
        IsAllDay: {
          description: 'Set to true if the event lasts all day',
          type: 'boolean',
          'x-ms-summary': 'Is all day event?',
          'x-ms-visibility': 'advanced',
        },
        RecurrenceEnd: {
          format: 'date-time',
          description: 'End time of the recurrence',
          type: 'string',
          'x-ms-summary': 'Recurrence end time',
          'x-ms-visibility': 'advanced',
        },
        NumberOfOccurrences: {
          format: 'int32',
          description: 'How many times to repeat the event',
          type: 'integer',
          'x-ms-summary': 'Number of occurrences',
          'x-ms-visibility': 'advanced',
        },
        Reminder: {
          format: 'int32',
          description: 'Time in minutes before event start to remind',
          type: 'integer',
          'x-ms-summary': 'Reminder',
          'x-ms-visibility': 'advanced',
        },
        ResponseRequested: {
          description: 'Set to true if the sender would like a response when the event is accepted or declined',
          type: 'boolean',
          'x-ms-summary': 'Response requested',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    GraphCalendarEventListClientReceive: {
      description: 'The list of calendar items returned by Graph API',
      type: 'object',
      properties: {
        value: {
          description: 'List of calendar items',
          type: 'array',
          items: {
            $ref: '#/definitions/GraphCalendarEventClientReceive',
          },
        },
      },
    },
    GraphCalendarEventClientReceive: {
      description: 'Connector specific calendar event model class for the client with Graph API',
      type: 'object',
      properties: {
        subject: {
          description: 'Event subject',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        start: {
          format: 'date-no-tz',
          description: "Start time of the event (example: '2017-08-29T04:00:00.0000000')",
          type: 'string',
          'x-ms-summary': 'Start time',
        },
        end: {
          format: 'date-no-tz',
          description: "End time of the event (example: '2017-08-29T05:00:00.0000000')",
          type: 'string',
          'x-ms-summary': 'End time',
        },
        startWithTimeZone: {
          format: 'date-time',
          description: "Start time of the event with time zone (example: '2017-08-29T04:00:00.0000000+00:00')",
          type: 'string',
          readOnly: true,
          'x-ms-summary': 'Start time with time zone',
        },
        endWithTimeZone: {
          format: 'date-time',
          description: "End time of the event with time zone (example: '2017-08-29T05:00:00.0000000+00:00')",
          type: 'string',
          readOnly: true,
          'x-ms-summary': 'End time with time zone',
        },
        body: {
          format: 'html',
          description: 'Body of the message associated with the event',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'advanced',
        },
        isHtml: {
          description: 'Set to true if the body is Html',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
        responseType: {
          description: 'The response type of the event (none, organizer, tentativelyAccepted, accepted, declined or notResponded)',
          enum: ['none', 'organizer', 'tentativelyAccepted', 'accepted', 'declined', 'notResponded'],
          type: 'string',
          'x-ms-summary': 'Response type',
          'x-ms-visibility': 'advanced',
        },
        responseTime: {
          format: 'date-time',
          description: 'The response time of the event',
          type: 'string',
          'x-ms-summary': 'Response time',
          'x-ms-visibility': 'advanced',
        },
        id: {
          description: "The event's unique identifier",
          type: 'string',
          'x-ms-summary': 'Id',
          'x-ms-visibility': 'advanced',
        },
        createdDateTime: {
          format: 'date-time',
          description: 'The date and time that the event was created',
          type: 'string',
          'x-ms-summary': 'Created time',
          'x-ms-visibility': 'advanced',
        },
        lastModifiedDateTime: {
          format: 'date-time',
          description: 'The date and time that the event was last modified',
          type: 'string',
          'x-ms-summary': 'Last modified time',
          'x-ms-visibility': 'advanced',
        },
        organizer: {
          format: 'email',
          description: 'The organizer of the event',
          type: 'string',
          'x-ms-summary': 'Organizer',
          'x-ms-visibility': 'advanced',
        },
        timeZone: {
          description: 'Time zone of the event',
          type: 'string',
          'x-ms-summary': 'Time zone',
          'x-ms-visibility': 'advanced',
        },
        seriesMasterId: {
          description: 'Unique identifier for Series Master event type',
          type: 'string',
          'x-ms-summary': 'Series master id',
          'x-ms-visibility': 'advanced',
        },
        iCalUId: {
          description: 'A unique identifier for an event across calendars. This ID is different for each occurrence in a recurring series',
          type: 'string',
          'x-ms-summary': 'iCalUId',
          'x-ms-visibility': 'advanced',
        },
        categories: {
          description: 'The categories associated with the event',
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Categories',
          'x-ms-visibility': 'advanced',
        },
        webLink: {
          format: 'uri',
          description: 'The URL to open the event in Outlook Web App',
          type: 'string',
          'x-ms-summary': 'Web link',
          'x-ms-visibility': 'advanced',
        },
        requiredAttendees: {
          format: 'email',
          description: 'Required attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Required attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        optionalAttendees: {
          format: 'email',
          description: 'Optional attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Optional attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        resourceAttendees: {
          description: 'Resource attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Resource attendees',
          'x-ms-visibility': 'advanced',
        },
        location: {
          description: 'Location of the event',
          type: 'string',
          'x-ms-summary': 'Location',
          'x-ms-visibility': 'advanced',
        },
        importance: {
          description: 'The importance of the event: low, normal, or high',
          enum: ['low', 'normal', 'high'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        isAllDay: {
          description: 'Set to true if the event lasts all day',
          type: 'boolean',
          'x-ms-summary': 'Is all day event?',
          'x-ms-visibility': 'advanced',
        },
        recurrence: {
          description: 'The recurrence pattern for the event: none, daily, weekly, monthly or yearly',
          enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
          type: 'string',
          'x-ms-summary': 'Recurrence',
          'x-ms-visibility': 'advanced',
        },
        recurrenceEnd: {
          format: 'date',
          description: 'End Date of the recurrence',
          type: 'string',
          'x-ms-summary': 'Recurrence end date',
          'x-ms-visibility': 'advanced',
        },
        numberOfOccurences: {
          format: 'int32',
          description: 'How many times to repeat the event',
          type: 'integer',
          'x-ms-summary': 'Number of occurrences',
          'x-ms-visibility': 'advanced',
        },
        reminderMinutesBeforeStart: {
          format: 'int32',
          description: 'Time in minutes before event start to remind',
          type: 'integer',
          'x-ms-summary': 'Reminder',
          'x-ms-visibility': 'advanced',
        },
        isReminderOn: {
          description: 'Set to true if an alert is set to remind the user of the event.',
          type: 'boolean',
          'x-ms-summary': 'Is reminder on',
          'x-ms-visibility': 'advanced',
        },
        showAs: {
          description: 'Status to show during the event: free, tentative, busy, oof, workingElsewhere or unknown',
          enum: ['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown'],
          type: 'string',
          'x-ms-summary': 'Show as',
          'x-ms-visibility': 'advanced',
        },
        responseRequested: {
          description: 'Set to true if the sender would like a response when the event is accepted or declined',
          type: 'boolean',
          'x-ms-summary': 'Response requested',
          'x-ms-visibility': 'advanced',
        },
        sensitivity: {
          description: 'The possible values are: normal, personal, private, confidential',
          enum: ['normal', 'personal', 'private', 'confidential'],
          type: 'string',
          'x-ms-summary': 'Sensitivity',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    'PaginatedListResponse[CalendarEventClientReceiveStringEnums]': {
      description: 'Response containing a list and next link',
      type: 'object',
      properties: {
        Values: {
          description: 'Values',
          type: 'array',
          items: {
            $ref: '#/definitions/CalendarEventClientReceiveStringEnums',
          },
        },
      },
    },
    CalendarEventClientReceiveStringEnums: {
      description: 'Connector specific calendar event model class for the client',
      type: 'object',
      properties: {
        Importance: {
          description: 'The importance of the event: Low, Normal, or High',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        ResponseType: {
          description: 'The response type of the event: None, Organizer, TentativelyAccepted, Accepted, Declined or NotResponded',
          enum: ['None', 'Organizer', 'TentativelyAccepted', 'Accepted', 'Declined', 'NotResponded'],
          type: 'string',
          'x-ms-summary': 'Response type',
          'x-ms-visibility': 'advanced',
        },
        Recurrence: {
          description: 'The recurrence pattern for the event',
          enum: ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'],
          type: 'string',
          'x-ms-summary': 'Recurrence',
          'x-ms-visibility': 'advanced',
        },
        ShowAs: {
          description: 'Status to show during the event',
          enum: ['Free', 'Tentative', 'Busy', 'Oof', 'WorkingElsewhere', 'Unknown'],
          type: 'string',
          'x-ms-summary': 'Show as',
          'x-ms-visibility': 'advanced',
        },
        Subject: {
          description: 'Event subject',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Start: {
          format: 'date-time',
          description: "Start time of the event (example: '2016-11-01T14:30:00Z')",
          type: 'string',
          'x-ms-summary': 'Start time',
        },
        End: {
          format: 'date-time',
          description: "End time of the event (example: '2016-11-01T15:30:00Z')",
          type: 'string',
          'x-ms-summary': 'End time',
        },
        ResponseTime: {
          format: 'date-time',
          description: 'The response time of the event',
          type: 'string',
          'x-ms-summary': 'Response time',
          'x-ms-visibility': 'advanced',
        },
        ICalUId: {
          description: 'A unique identifier that is shared by all instances of an event across different calendars',
          type: 'string',
          'x-ms-summary': 'Event Unique ID',
          'x-ms-visibility': 'advanced',
        },
        Id: {
          description: "The event's unique identifier",
          type: 'string',
          'x-ms-summary': 'Id',
          'x-ms-visibility': 'advanced',
        },
        DateTimeCreated: {
          format: 'date-time',
          description: 'The date and time that the event was created',
          type: 'string',
          'x-ms-summary': 'Created time',
          'x-ms-visibility': 'advanced',
        },
        DateTimeLastModified: {
          format: 'date-time',
          description: 'The date and time that the event was last modified',
          type: 'string',
          'x-ms-summary': 'Last modified time',
          'x-ms-visibility': 'advanced',
        },
        Organizer: {
          format: 'email',
          description: 'The organizer of the event',
          type: 'string',
          'x-ms-summary': 'Organizer',
          'x-ms-visibility': 'advanced',
        },
        TimeZone: {
          description: 'Time zone of the event',
          type: 'string',
          'x-ms-summary': 'Time zone',
          'x-ms-visibility': 'advanced',
        },
        SeriesMasterId: {
          description: 'Unique identifier for Series Master event type',
          type: 'string',
          'x-ms-summary': 'Series master id',
          'x-ms-visibility': 'advanced',
        },
        Categories: {
          description: 'The categories associated with the event',
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Categories',
          'x-ms-visibility': 'advanced',
        },
        WebLink: {
          format: 'uri',
          description: 'The URL to open the event in Outlook Web App',
          type: 'string',
          'x-ms-summary': 'Web link',
          'x-ms-visibility': 'advanced',
        },
        RequiredAttendees: {
          format: 'email',
          description: 'Required attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Required attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        OptionalAttendees: {
          format: 'email',
          description: 'Optional attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Optional attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        ResourceAttendees: {
          description: 'Resource attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Resource attendees',
          'x-ms-visibility': 'advanced',
        },
        Body: {
          description: 'Body of the message associated with the event',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'advanced',
        },
        IsHtml: {
          description: 'Set to true if the body is Html',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
        Location: {
          description: 'Location of the event',
          type: 'string',
          'x-ms-summary': 'Location',
          'x-ms-visibility': 'advanced',
        },
        IsAllDay: {
          description: 'Set to true if the event lasts all day',
          type: 'boolean',
          'x-ms-summary': 'Is all day event?',
          'x-ms-visibility': 'advanced',
        },
        RecurrenceEnd: {
          format: 'date-time',
          description: 'End time of the recurrence',
          type: 'string',
          'x-ms-summary': 'Recurrence end time',
          'x-ms-visibility': 'advanced',
        },
        NumberOfOccurrences: {
          format: 'int32',
          description: 'How many times to repeat the event',
          type: 'integer',
          'x-ms-summary': 'Number of occurrences',
          'x-ms-visibility': 'advanced',
        },
        Reminder: {
          format: 'int32',
          description: 'Time in minutes before event start to remind',
          type: 'integer',
          'x-ms-summary': 'Reminder',
          'x-ms-visibility': 'advanced',
        },
        ResponseRequested: {
          description: 'Set to true if the sender would like a response when the event is accepted or declined',
          type: 'boolean',
          'x-ms-summary': 'Response requested',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    ClientSubscription: {
      description: 'Describes the subscription information.',
      required: ['NotificationUrl'],
      type: 'object',
      properties: {
        NotificationUrl: {
          description: 'Callback url to the flow engine. Expected as part of the request and provided by Flow.',
          type: 'string',
          'x-ms-visibility': 'internal',
          'x-ms-notification-url': true,
        },
      },
    },
    SubscriptionResponse: {
      description: 'Base response model that connector returns to LA engine',
      type: 'object',
      properties: {
        id: {
          description: 'Id of the subscription',
          type: 'string',
        },
        resource: {
          description: 'Resource of the subscription request',
          type: 'string',
        },
        notificationType: {
          description: 'Notification Type',
          type: 'string',
        },
        notificationUrl: {
          description: 'Notification Url',
          type: 'string',
        },
      },
    },
    'EntityListResponse[FilePickerFile]': {
      description: 'Entity list response',
      type: 'object',
      properties: {
        value: {
          description: 'List of values',
          type: 'array',
          items: {
            $ref: '#/definitions/FilePickerFile',
          },
        },
      },
    },
    FilePickerFile: {
      description: 'FilePickerFile',
      type: 'object',
      properties: {
        Id: {
          description: 'Uniquely identifies the file',
          type: 'string',
        },
        DisplayName: {
          description: 'Display name for the file',
          type: 'string',
        },
        IsFolder: {
          description: 'Set to true if the file is a folder',
          type: 'boolean',
        },
        Path: {
          description: 'Path of the file',
          type: 'string',
        },
      },
    },
    ClientSendMessage: {
      description: 'Send Email Message',
      required: ['To', 'Subject', 'Body'],
      type: 'object',
      properties: {
        From: {
          format: 'email',
          description:
            'Email address to send mail from (requires "Send as" or "Send on behalf of" permission for that mailbox). For more info on granting permissions please refer https://docs.microsoft.com/office365/admin/manage/send-email-as-distribution-list',
          type: 'string',
          'x-ms-summary': 'From (Send as)',
          'x-ms-visibility': 'advanced',
        },
        Cc: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'CC',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Bcc: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'BCC',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        To: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Subject: {
          description: 'Specify the subject of the mail',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Body: {
          description: 'Specify the body of the mail',
          type: 'string',
          'x-ms-summary': 'Body',
        },
        Attachments: {
          description: 'Attachments',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientSendAttachment',
          },
          'x-ms-summary': 'Attachments',
          'x-ms-visibility': 'advanced',
        },
        Sensitivity: {
          description: 'Sensitivity',
          type: 'string',
          'x-ms-summary': 'Sensitivity',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            operationId: 'GetSensitivityLabels',
            parameters: {},
            'value-path': 'Id',
            'value-title': 'DisplayName',
          },
        },
        ReplyTo: {
          format: 'email',
          description: 'The email addresses to use when replying',
          type: 'string',
          'x-ms-summary': 'Reply To',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          description: 'Importance',
          default: 'Normal',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        IsHtml: {
          description: 'Is Html?',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    ClientSendAttachment: {
      description: 'Attachment',
      required: ['Name', 'ContentBytes'],
      type: 'object',
      properties: {
        Name: {
          description: 'Attachment name',
          type: 'string',
          'x-ms-summary': 'Name',
        },
        ContentBytes: {
          format: 'byte',
          description: 'Attachment content',
          type: 'string',
          'x-ms-summary': 'Content',
        },
      },
    },
    ClientReceiveMessageStringEnums: {
      description: 'Receive Email Message',
      type: 'object',
      properties: {
        Importance: {
          description: 'The importance of the message',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
        },
        From: {
          format: 'email',
          description: 'The mailbox owner and sender of the message',
          type: 'string',
          'x-ms-summary': 'From',
          'x-ms-visibility': 'important',
        },
        To: {
          format: 'email',
          description: 'The recipients for the message',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-visibility': 'important',
        },
        Cc: {
          format: 'email',
          description: 'The Cc recipients for the message',
          type: 'string',
          'x-ms-summary': 'CC',
          'x-ms-visibility': 'advanced',
        },
        Bcc: {
          format: 'email',
          description: 'The Bcc recipients for the message',
          type: 'string',
          'x-ms-summary': 'BCC',
          'x-ms-visibility': 'advanced',
        },
        ReplyTo: {
          format: 'email',
          description: 'The email addresses to use when replying',
          type: 'string',
          'x-ms-summary': 'Reply To',
          'x-ms-visibility': 'advanced',
        },
        Subject: {
          description: 'The subject of the message',
          type: 'string',
          'x-ms-summary': 'Subject',
          'x-ms-visibility': 'important',
        },
        Body: {
          description: 'The body of the message',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'important',
        },
        BodyPreview: {
          description: 'The preview of the message',
          type: 'string',
          'x-ms-summary': 'Body Preview',
          'x-ms-visibility': 'advanced',
        },
        HasAttachment: {
          description: 'Indicates whether the message has attachments',
          type: 'boolean',
          'x-ms-summary': 'Has Attachment',
        },
        Id: {
          description: 'The unique identifier of the message',
          type: 'string',
          'x-ms-summary': 'Message Id',
          'x-ms-visibility': 'advanced',
        },
        InternetMessageId: {
          description: 'The message ID in the format specified by RFC2822',
          type: 'string',
          'x-ms-summary': 'Internet Message Id',
          'x-ms-visibility': 'advanced',
        },
        ConversationId: {
          description: 'The Id of the conversation the email belongs to',
          type: 'string',
          'x-ms-summary': 'Conversation Id',
          'x-ms-visibility': 'advanced',
        },
        DateTimeReceived: {
          format: 'date-time',
          description: 'The date and time the message was received',
          type: 'string',
          'x-ms-summary': 'Received Time',
          'x-ms-visibility': 'advanced',
        },
        IsRead: {
          description: 'Indicates whether the message has been read',
          type: 'boolean',
          'x-ms-summary': 'Is Read',
          'x-ms-visibility': 'advanced',
        },
        Attachments: {
          description: 'The file attachments for the message',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientReceiveFileAttachment',
          },
          'x-ms-summary': 'Attachments',
          'x-ms-visibility': 'advanced',
        },
        IsHtml: {
          description: 'Is Html?',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    ClientReceiveFileAttachment: {
      description: 'File Attachment',
      type: 'object',
      properties: {
        Id: {
          description: 'Attachment Id',
          type: 'string',
          'x-ms-summary': 'Attachment Id',
        },
        Name: {
          description: 'Attachment name',
          type: 'string',
          'x-ms-summary': 'Name',
        },
        ContentBytes: {
          format: 'byte',
          description: 'Attachment content',
          type: 'string',
          'x-ms-summary': 'Content',
        },
        ContentType: {
          description: 'Attachment content type',
          type: 'string',
          'x-ms-summary': 'Content-Type',
        },
        Size: {
          format: 'int64',
          description: 'The size in bytes of the attachment',
          type: 'integer',
          'x-ms-summary': 'Size',
        },
        IsInline: {
          description: 'Set to true if this is an inline attachment',
          type: 'boolean',
          'x-ms-summary': 'Is Inline',
        },
        LastModifiedDateTime: {
          format: 'date-time',
          description: 'The date and time when the attachment was last modified',
          type: 'string',
          'x-ms-summary': 'Last Modified DateTime',
        },
        ContentId: {
          description: 'Content Id',
          type: 'string',
          'x-ms-summary': 'Content Id',
        },
      },
    },
    ClientSendHtmlMessage: {
      description: 'Send HTML Email Message',
      required: ['To', 'Subject', 'Body'],
      type: 'object',
      properties: {
        To: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Subject: {
          description: 'Specify the subject of the mail',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Body: {
          format: 'html',
          description: 'Specify the body of the mail',
          type: 'string',
          'x-ms-summary': 'Body',
        },
        From: {
          format: 'email',
          description:
            'Email address to send mail from (requires "Send as" or "Send on behalf of" permission for that mailbox). For more info on granting permissions please refer https://docs.microsoft.com/office365/admin/manage/send-email-as-distribution-list',
          type: 'string',
          'x-ms-summary': 'From (Send as)',
          'x-ms-visibility': 'advanced',
        },
        Cc: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'CC',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Bcc: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'BCC',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Attachments: {
          description: 'Attachments',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientSendAttachment',
          },
          'x-ms-summary': 'Attachments',
          'x-ms-visibility': 'advanced',
        },
        Sensitivity: {
          description: 'Sensitivity',
          type: 'string',
          'x-ms-summary': 'Sensitivity',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            operationId: 'GetSensitivityLabels',
            parameters: {},
            'value-path': 'Id',
            'value-title': 'DisplayName',
          },
        },
        ReplyTo: {
          format: 'email',
          description: 'The email addresses to use when replying',
          type: 'string',
          'x-ms-summary': 'Reply To',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          description: 'Importance',
          default: 'Normal',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    'BatchResponse[ClientReceiveMessage]': {
      description: 'Represents a wrapper object for batch response',
      type: 'object',
      properties: {
        value: {
          description: 'A list of the response objects',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientReceiveMessage',
          },
          readOnly: true,
        },
      },
    },
    ClientReceiveMessage: {
      description: 'Receive Email Message',
      type: 'object',
      properties: {
        From: {
          format: 'email',
          description: 'The mailbox owner and sender of the message',
          type: 'string',
          'x-ms-summary': 'From',
          'x-ms-visibility': 'important',
        },
        To: {
          format: 'email',
          description: 'The recipients for the message',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-visibility': 'important',
        },
        Cc: {
          format: 'email',
          description: 'The Cc recipients for the message',
          type: 'string',
          'x-ms-summary': 'CC',
          'x-ms-visibility': 'advanced',
        },
        Bcc: {
          format: 'email',
          description: 'The Bcc recipients for the message',
          type: 'string',
          'x-ms-summary': 'BCC',
          'x-ms-visibility': 'advanced',
        },
        ReplyTo: {
          format: 'email',
          description: 'The email addresses to use when replying',
          type: 'string',
          'x-ms-summary': 'Reply To',
          'x-ms-visibility': 'advanced',
        },
        Subject: {
          description: 'The subject of the message',
          type: 'string',
          'x-ms-summary': 'Subject',
          'x-ms-visibility': 'important',
        },
        Body: {
          description: 'The body of the message',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'important',
        },
        Importance: {
          format: 'int32',
          description: 'The importance of the message (0 - Low, 1 - Normal, 2 - High)',
          type: 'integer',
          'x-ms-summary': 'Importance',
        },
        BodyPreview: {
          description: 'The preview of the message',
          type: 'string',
          'x-ms-summary': 'Body Preview',
          'x-ms-visibility': 'advanced',
        },
        HasAttachment: {
          description: 'Indicates whether the message has attachments',
          type: 'boolean',
          'x-ms-summary': 'Has Attachment',
        },
        Id: {
          description: 'The unique identifier of the message',
          type: 'string',
          'x-ms-summary': 'Message Id',
          'x-ms-visibility': 'advanced',
        },
        InternetMessageId: {
          description: 'The message ID in the format specified by RFC2822',
          type: 'string',
          'x-ms-summary': 'Internet Message Id',
          'x-ms-visibility': 'advanced',
        },
        ConversationId: {
          description: 'The Id of the conversation the email belongs to',
          type: 'string',
          'x-ms-summary': 'Conversation Id',
          'x-ms-visibility': 'advanced',
        },
        DateTimeReceived: {
          format: 'date-time',
          description: 'The date and time the message was received',
          type: 'string',
          'x-ms-summary': 'Received Time',
          'x-ms-visibility': 'advanced',
        },
        IsRead: {
          description: 'Indicates whether the message has been read',
          type: 'boolean',
          'x-ms-summary': 'Is Read',
          'x-ms-visibility': 'advanced',
        },
        Attachments: {
          description: 'The file attachments for the message',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientReceiveFileAttachment',
          },
          'x-ms-summary': 'Attachments',
          'x-ms-visibility': 'advanced',
        },
        IsHtml: {
          description: 'Is Html?',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    GraphClientReceiveMessage: {
      description: 'Graph Client Receive Email Message',
      type: 'object',
      properties: {
        from: {
          format: 'email',
          description: 'The mailbox owner and sender of the message',
          type: 'string',
          'x-ms-summary': 'From',
          'x-ms-visibility': 'important',
        },
        toRecipients: {
          format: 'email',
          description: 'The recipients for the message',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-visibility': 'important',
        },
        ccRecipients: {
          format: 'email',
          description: 'The Cc recipients for the message',
          type: 'string',
          'x-ms-summary': 'CC',
          'x-ms-visibility': 'advanced',
        },
        bccRecipients: {
          format: 'email',
          description: 'The Bcc recipients for the message',
          type: 'string',
          'x-ms-summary': 'BCC',
          'x-ms-visibility': 'advanced',
        },
        replyTo: {
          format: 'email',
          description: 'The email addresses to use when replying',
          type: 'string',
          'x-ms-summary': 'Reply To',
          'x-ms-visibility': 'advanced',
        },
        subject: {
          description: 'The subject of the message',
          type: 'string',
          'x-ms-summary': 'Subject',
          'x-ms-visibility': 'important',
        },
        body: {
          description: 'The body of the message',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'important',
        },
        importance: {
          description: 'The importance of the message (low, normal, high)',
          enum: ['low', 'normal', 'high'],
          type: 'string',
          'x-ms-summary': 'Importance',
        },
        bodyPreview: {
          description: 'The preview of the message',
          type: 'string',
          'x-ms-summary': 'Body Preview',
          'x-ms-visibility': 'advanced',
        },
        hasAttachments: {
          description: 'Indicates whether the message has attachments',
          type: 'boolean',
          'x-ms-summary': 'Has Attachment',
        },
        id: {
          description: 'The unique identifier of the message',
          type: 'string',
          'x-ms-summary': 'Message Id',
          'x-ms-visibility': 'advanced',
        },
        internetMessageId: {
          description: 'The message ID in the format specified by RFC2822',
          type: 'string',
          'x-ms-summary': 'Internet Message Id',
          'x-ms-visibility': 'advanced',
        },
        conversationId: {
          description: 'The Id of the conversation the email belongs to',
          type: 'string',
          'x-ms-summary': 'Conversation Id',
          'x-ms-visibility': 'advanced',
        },
        receivedDateTime: {
          format: 'date-time',
          description: 'The date and time the message was received',
          type: 'string',
          'x-ms-summary': 'Received Time',
          'x-ms-visibility': 'advanced',
        },
        isRead: {
          description: 'Indicates whether the message has been read',
          type: 'boolean',
          'x-ms-summary': 'Is Read',
          'x-ms-visibility': 'advanced',
        },
        attachments: {
          description: 'The file attachments for the message',
          type: 'array',
          items: {
            $ref: '#/definitions/GraphClientReceiveFileAttachment',
          },
          'x-ms-summary': 'Attachments',
          'x-ms-visibility': 'advanced',
        },
        isHtml: {
          description: 'Is Html?',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    GraphClientReceiveFileAttachment: {
      description: 'File Attachment',
      type: 'object',
      properties: {
        id: {
          description: 'Attachment Id',
          type: 'string',
          'x-ms-summary': 'Attachment Id',
        },
        name: {
          description: 'Attachment name',
          type: 'string',
          'x-ms-summary': 'Name',
        },
        contentBytes: {
          format: 'byte',
          description: 'Attachment content',
          type: 'string',
          'x-ms-summary': 'Content',
        },
        contentType: {
          description: 'Attachment content type',
          type: 'string',
          'x-ms-summary': 'Content-Type',
        },
        size: {
          format: 'int64',
          description: 'The size in bytes of the attachment',
          type: 'integer',
          'x-ms-summary': 'Size',
        },
        isInline: {
          description: 'Set to true if this is an inline attachment',
          type: 'boolean',
          'x-ms-summary': 'Is Inline',
        },
        lastModifiedDateTime: {
          format: 'date-time',
          description: 'The date and time when the attachment was last modified',
          type: 'string',
          'x-ms-summary': 'Last Modified DateTime',
        },
        contentId: {
          description: 'Content Id',
          type: 'string',
          'x-ms-summary': 'Content Id',
        },
      },
    },
    'BatchResponse[GraphClientReceiveMessage]': {
      description: 'Represents a wrapper object for batch response',
      type: 'object',
      properties: {
        value: {
          description: 'A list of the response objects',
          type: 'array',
          items: {
            $ref: '#/definitions/GraphClientReceiveMessage',
          },
          readOnly: true,
        },
      },
    },
    ReplyMessage: {
      description: 'Properties of an email reply message.',
      type: 'object',
      properties: {
        To: {
          format: 'email',
          description: 'Example: recipient1@domain.com; recipient2@domain.com',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-visibility': 'advanced',
        },
        Cc: {
          format: 'email',
          description: 'Example: recipient1@domain.com; recipient2@domain.com',
          type: 'string',
          'x-ms-summary': 'CC',
          'x-ms-visibility': 'advanced',
        },
        Bcc: {
          format: 'email',
          description: 'Example: recipient1@domain.com; recipient2@domain.com',
          type: 'string',
          'x-ms-summary': 'BCC',
          'x-ms-visibility': 'advanced',
        },
        Subject: {
          description: 'Email subject (if empty, the original subject used).',
          type: 'string',
          'x-ms-summary': 'Subject',
          'x-ms-visibility': 'advanced',
        },
        Body: {
          description: 'Content of the email.',
          type: 'string',
          'x-ms-summary': 'Body',
        },
        ReplyAll: {
          description: 'True to reply to all recipients. (default: False)',
          type: 'boolean',
          'x-ms-summary': 'Reply All',
        },
        IsHtml: {
          description: 'True to send the reply as HTML. (default: True)',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          description: 'Pick an importance. (default: Low)',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        Attachments: {
          description: 'Details of attachments to be sent along with the reply.',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientSendAttachment',
          },
          'x-ms-summary': 'Attachments',
        },
      },
    },
    ReplyHtmlMessage: {
      description: 'Properties of an HTML email reply message.',
      type: 'object',
      properties: {
        To: {
          format: 'email',
          description: 'Example: recipient1@domain.com; recipient2@domain.com',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-visibility': 'advanced',
        },
        Cc: {
          format: 'email',
          description: 'Example: recipient1@domain.com; recipient2@domain.com',
          type: 'string',
          'x-ms-summary': 'CC',
          'x-ms-visibility': 'advanced',
        },
        Bcc: {
          format: 'email',
          description: 'Example: recipient1@domain.com; recipient2@domain.com',
          type: 'string',
          'x-ms-summary': 'BCC',
          'x-ms-visibility': 'advanced',
        },
        Subject: {
          description: 'Email subject (if empty, the original subject used).',
          type: 'string',
          'x-ms-summary': 'Subject',
          'x-ms-visibility': 'advanced',
        },
        Body: {
          format: 'html',
          description: 'Content of the email.',
          type: 'string',
          'x-ms-summary': 'Body',
        },
        ReplyAll: {
          description: 'True to reply to all recipients. (default: False)',
          type: 'boolean',
          'x-ms-summary': 'Reply All',
        },
        Importance: {
          description: 'Pick an importance. (default: Low)',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        Attachments: {
          description: 'Details of attachments to be sent along with the reply.',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientSendAttachment',
          },
          'x-ms-summary': 'Attachments',
        },
      },
    },
    'TriggerBatchResponse[ClientReceiveMessage]': {
      description: 'Represents a wrapper object for batch trigger response',
      type: 'object',
      properties: {
        value: {
          description: 'A list of the response objects',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientReceiveMessage',
          },
        },
      },
    },
    'TriggerBatchResponse[GraphClientReceiveMessage]': {
      description: 'Represents a wrapper object for batch trigger response',
      type: 'object',
      properties: {
        value: {
          description: 'A list of the response objects',
          type: 'array',
          items: {
            $ref: '#/definitions/GraphClientReceiveMessage',
          },
        },
      },
    },
    AutomaticRepliesSettingClient: {
      description: 'Automatic replies setting model for the connector',
      required: ['Status', 'ExternalAudience'],
      type: 'object',
      properties: {
        Status: {
          description: 'Automatic reply setting status',
          default: 'Scheduled',
          enum: ['Disabled', 'AlwaysEnabled', 'Scheduled'],
          type: 'string',
          'x-ms-summary': 'Status',
        },
        ExternalAudience: {
          description: 'The audience that will see the external reply message',
          default: 'None',
          enum: ['None', 'ContactsOnly', 'All'],
          type: 'string',
          'x-ms-summary': 'External Audience',
        },
        ScheduledStartDateTimeOffset: {
          description: "Scheduled start time (example: '2016-11-01T15:30:00-00:00Z')",
          type: 'string',
          'x-ms-summary': 'Start Time',
        },
        ScheduledEndDateTimeOffset: {
          description: "Scheduled end time (example: '2016-11-01T15:30:00-00:00Z')",
          type: 'string',
          'x-ms-summary': 'End Time',
        },
        InternalReplyMessage: {
          description: 'Message for people within your organization',
          type: 'string',
          'x-ms-summary': 'Internal Reply Message',
        },
        ExternalReplyMessage: {
          description: 'Message for people outside your organization',
          type: 'string',
          'x-ms-summary': 'External Reply Message',
        },
      },
    },
    MailTipsClientReceive: {
      description: 'Mail tips client model returned to the caller',
      type: 'object',
      properties: {
        AutomaticReplies: {
          $ref: '#/definitions/MailTipsAutomaticReplies',
        },
        DeliveryRestricted: {
          description: 'Is delivery restricted',
          type: 'boolean',
        },
        ExternalMemberCount: {
          format: 'int32',
          description: 'Number of external members',
          type: 'integer',
        },
        IsModerated: {
          description: 'Is moderated',
          type: 'boolean',
        },
        MailboxFull: {
          description: 'Is mailbox full',
          type: 'boolean',
        },
        MaxMessageSize: {
          format: 'int64',
          description: 'Maximum message size',
          type: 'integer',
        },
        TotalMemberCount: {
          format: 'int64',
          description: 'Total member count',
          type: 'integer',
        },
      },
    },
    MailTipsAutomaticReplies: {
      description: 'Automatic replies as part of mail tips',
      type: 'object',
      properties: {
        Message: {
          description: 'Automatic replies message',
          type: 'string',
        },
      },
    },
    'BatchResponse[SensitivityLabel]': {
      description: 'Represents a wrapper object for batch response',
      type: 'object',
      properties: {
        value: {
          description: 'A list of the response objects',
          type: 'array',
          items: {
            $ref: '#/definitions/SensitivityLabel',
          },
          readOnly: true,
        },
      },
    },
    SensitivityLabel: {
      description: 'Contact folder data model',
      type: 'object',
      properties: {
        Id: {
          description: 'Gets or sets the identifier.',
          type: 'string',
        },
        DisplayName: {
          description: 'Gets or sets the display name.',
          type: 'string',
        },
        ApplicableTo: {
          description: 'Gets or sets the applicable to.',
          type: 'string',
        },
        SubLabels: {
          description: 'Gets or sets sub labels.',
          type: 'array',
          items: {
            $ref: '#/definitions/SensitivityLabel',
          },
        },
      },
    },
    'TriggerBatchResponse[ReceiveMessageMetadata]': {
      description: 'Represents a wrapper object for batch trigger response',
      type: 'object',
      properties: {
        value: {
          description: 'A list of the response objects',
          type: 'array',
          items: {
            $ref: '#/definitions/ReceiveMessageMetadata',
          },
        },
      },
    },
    ReceiveMessageMetadata: {
      description: 'Receive Email Message',
      type: 'object',
      properties: {
        From: {
          format: 'email',
          description: 'The mailbox owner and sender of the message',
          type: 'string',
          'x-ms-summary': 'From',
          'x-ms-visibility': 'important',
        },
        To: {
          format: 'email',
          description: 'The recipients for the message',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-visibility': 'important',
        },
        Cc: {
          format: 'email',
          description: 'The Cc recipients for the message',
          type: 'string',
          'x-ms-summary': 'CC',
          'x-ms-visibility': 'advanced',
        },
        Bcc: {
          format: 'email',
          description: 'The Bcc recipients for the message',
          type: 'string',
          'x-ms-summary': 'BCC',
          'x-ms-visibility': 'advanced',
        },
        ReplyTo: {
          format: 'email',
          description: 'The email addresses to use when replying',
          type: 'string',
          'x-ms-summary': 'Reply To',
          'x-ms-visibility': 'advanced',
        },
        Subject: {
          description: 'The subject of the message',
          type: 'string',
          'x-ms-summary': 'Subject',
          'x-ms-visibility': 'important',
        },
        Importance: {
          format: 'int32',
          description: 'The importance of the message  (0 - Low, 1 - Normal, 2 - High)',
          type: 'integer',
          'x-ms-summary': 'Importance',
        },
        HasAttachment: {
          description: 'Indicates whether the message has attachments',
          type: 'boolean',
          'x-ms-summary': 'Has Attachment',
        },
        Id: {
          description: 'The unique identifier of the message',
          type: 'string',
          'x-ms-summary': 'Message Id',
          'x-ms-visibility': 'advanced',
        },
        DateTimeReceived: {
          format: 'date-time',
          description: 'The date and time the message was received',
          type: 'string',
          'x-ms-summary': 'Received Time',
          'x-ms-visibility': 'advanced',
        },
        IsRead: {
          description: 'Indicates whether the message has been read',
          type: 'boolean',
          'x-ms-summary': 'Is Read',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    DataSetsMetadata: {
      description: 'Dataset metadata',
      type: 'object',
      properties: {
        tabular: {
          $ref: '#/definitions/TabularDataSetsMetadata',
        },
        blob: {
          $ref: '#/definitions/BlobDataSetsMetadata',
        },
      },
    },
    TabularDataSetsMetadata: {
      description: 'Tabular dataset metadata',
      type: 'object',
      properties: {
        source: {
          description: 'Dataset source',
          type: 'string',
        },
        displayName: {
          description: 'Dataset display name',
          type: 'string',
        },
        urlEncoding: {
          description: 'Dataset url encoding',
          type: 'string',
        },
        tableDisplayName: {
          description: 'Table display name',
          type: 'string',
        },
        tablePluralName: {
          description: 'Table plural display name',
          type: 'string',
        },
      },
    },
    BlobDataSetsMetadata: {
      description: 'Blob dataset metadata',
      type: 'object',
      properties: {
        source: {
          description: 'Blob dataset source',
          type: 'string',
        },
        displayName: {
          description: 'Blob dataset display name',
          type: 'string',
        },
        urlEncoding: {
          description: 'Blob dataset url encoding',
          type: 'string',
        },
      },
    },
    OptionsEmailSubscription: {
      description: 'Model for Options Email Subscription',
      required: ['Message', 'NotificationUrl'],
      type: 'object',
      properties: {
        NotificationUrl: {
          description: 'Gets or sets callback url to flow engine. It is expected as part of request',
          type: 'string',
          'x-ms-visibility': 'internal',
          'x-ms-notification-url': true,
        },
        Message: {
          $ref: '#/definitions/MessageWithOptions',
        },
      },
    },
    MessageWithOptions: {
      description: 'User Options Email Message. This is the message expected as part of user input',
      required: ['To'],
      type: 'object',
      properties: {
        To: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Subject: {
          description: 'Subject of the email',
          default: 'Your input is required',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Options: {
          description: 'List of comma separated options for the email response',
          default: 'Choice1, Choice2, Choice3',
          type: 'string',
          'x-ms-summary': 'User Options',
        },
        HeaderText: {
          description: 'Header text for email body',
          type: 'string',
          'x-ms-summary': 'Header Text',
          'x-ms-visibility': 'advanced',
        },
        SelectionText: {
          description: 'Header text for users options selection',
          type: 'string',
          'x-ms-summary': 'Selection Text',
          'x-ms-visibility': 'advanced',
        },
        Body: {
          description: 'Body of the email',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          description: 'Importance',
          default: 'Normal',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        Attachments: {
          description: 'Attachments',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientSendAttachment',
          },
          'x-ms-summary': 'Attachments',
          'x-ms-visibility': 'advanced',
        },
        UseOnlyHTMLMessage: {
          description: 'Use only HTML message',
          type: 'boolean',
          'x-ms-summary': 'Use only HTML message',
          'x-ms-visibility': 'advanced',
        },
        HideHTMLMessage: {
          description:
            'If set to Yes, then the email body is hidden and only message card is displayed. Email clients which do not support actionable messages will display HTML message regardless of the parameter value.',
          default: false,
          type: 'boolean',
          'x-ms-summary': 'Hide HTML message',
          'x-ms-visibility': 'advanced',
        },
        ShowHTMLConfirmationDialog: {
          description: 'If set to Yes then a dialog wil be shown to confirm selected option of HTML message',
          default: false,
          type: 'boolean',
          'x-ms-summary': 'Show HTML confirmation dialog',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    ApprovalEmailResponse: {
      description: 'Approval Email Response',
      type: 'object',
      properties: {
        SelectedOption: {
          description: 'User response',
          type: 'string',
        },
        UserEmailAddress: {
          description:
            "User email address. The value is the user's email address for individual users and user ID for the members in Distribution Group or Mail Enabled Security Group.",
          type: 'string',
        },
        UserTenantId: {
          description:
            'User tenant ID. The value is the tenant id of the user for both individual users and the members in Distribution Group or Mail Enabled Security Group.',
          type: 'string',
        },
        UserId: {
          description:
            'User ID. The value is the user id for both individual users and the members in Distribution Group or Mail Enabled Security Group.',
          type: 'string',
        },
      },
    },
    ApprovalEmailSubscription: {
      description: 'Model for Approval Email Subscription',
      required: ['Message', 'NotificationUrl'],
      type: 'object',
      properties: {
        NotificationUrl: {
          description: 'Gets or sets callback url to flow engine. It is expected as part of request',
          type: 'string',
          'x-ms-visibility': 'internal',
          'x-ms-notification-url': true,
        },
        Message: {
          $ref: '#/definitions/ApprovalMessage',
        },
      },
    },
    ApprovalMessage: {
      description: 'Approval Email Message. This is the message expected as part of user input',
      required: ['To'],
      type: 'object',
      properties: {
        To: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Subject: {
          description: 'Subject',
          default: 'Approval Request',
          type: 'string',
          'x-ms-summary': 'Subject',
          'x-ms-localizeDefaultValue': true,
        },
        Options: {
          description: 'User Options',
          default: 'Approve, Reject',
          type: 'string',
          'x-ms-summary': 'User Options',
          'x-ms-localizeDefaultValue': true,
        },
        HeaderText: {
          description: 'Header text for email body',
          type: 'string',
          'x-ms-summary': 'Header Text',
          'x-ms-visibility': 'advanced',
        },
        SelectionText: {
          description: 'Header text for users options selection',
          type: 'string',
          'x-ms-summary': 'Selection Text',
          'x-ms-visibility': 'advanced',
        },
        Body: {
          description: 'Body',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          description: 'Importance',
          default: 'Normal',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        Attachments: {
          description: 'Attachments',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientSendAttachment',
          },
          'x-ms-summary': 'Attachments',
          'x-ms-visibility': 'advanced',
        },
        UseOnlyHTMLMessage: {
          description: 'Use only HTML message',
          type: 'boolean',
          'x-ms-summary': 'Use only HTML message',
          'x-ms-visibility': 'advanced',
        },
        HideHTMLMessage: {
          description:
            'If set to Yes, then the email body is hidden and only message card is displayed. Email clients which do not support actionable messages will display HTML message regardless of the parameter value.',
          default: false,
          type: 'boolean',
          'x-ms-summary': 'Hide HTML message',
          'x-ms-visibility': 'advanced',
        },
        ShowHTMLConfirmationDialog: {
          description: 'If set to Yes then a dialog wil be shown to confirm selected option of HTML message',
          default: false,
          type: 'boolean',
          'x-ms-summary': 'Show HTML confirmation dialog',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    SharedMailboxClientSendMessage: {
      description: 'Shared Mailbox Send Email Message',
      required: ['MailboxAddress', 'To', 'Subject', 'Body'],
      type: 'object',
      properties: {
        MailboxAddress: {
          format: 'email',
          description: 'Specify email address of a shared mailbox like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'Original Mailbox Address',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        To: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Subject: {
          description: 'Specify the subject of the mail',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Body: {
          description: 'Specify the body of the mail',
          type: 'string',
          'x-ms-summary': 'Body',
        },
        Cc: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'CC',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Bcc: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'BCC',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Attachments: {
          description: 'Attachments',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientSendAttachment',
          },
          'x-ms-summary': 'Attachments',
          'x-ms-visibility': 'advanced',
        },
        ReplyTo: {
          format: 'email',
          description: 'The email addresses to use when replying',
          type: 'string',
          'x-ms-summary': 'Reply To',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          description: 'Importance',
          default: 'Normal',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        IsHtml: {
          description: 'Is Html?',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    SharedMailboxClientSendHtmlMessage: {
      description: 'Shared Mailbox Send HTML Email Message',
      required: ['MailboxAddress', 'To', 'Subject', 'Body'],
      type: 'object',
      properties: {
        MailboxAddress: {
          format: 'email',
          description: 'Specify email address of a shared mailbox like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'Original Mailbox Address',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        To: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'To',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Subject: {
          description: 'Specify the subject of the mail',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Body: {
          format: 'html',
          description: 'Specify the body of the mail',
          type: 'string',
          'x-ms-summary': 'Body',
        },
        Cc: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'CC',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Bcc: {
          format: 'email',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          type: 'string',
          'x-ms-summary': 'BCC',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        Attachments: {
          description: 'Attachments',
          type: 'array',
          items: {
            $ref: '#/definitions/ClientSendAttachment',
          },
          'x-ms-summary': 'Attachments',
          'x-ms-visibility': 'advanced',
        },
        ReplyTo: {
          format: 'email',
          description: 'The email addresses to use when replying',
          type: 'string',
          'x-ms-summary': 'Reply To',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          description: 'Importance',
          default: 'Normal',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    'SubscriptionPayload[OutlookReceiveMessage]': {
      description: 'Payload from backend containing subscription metadata as well as data',
      type: 'object',
      properties: {
        value: {
          description: 'List of values',
          type: 'array',
          items: {
            $ref: '#/definitions/SubscriptionPayloadEntity[OutlookReceiveMessage]',
          },
        },
      },
    },
    'SubscriptionPayloadEntity[OutlookReceiveMessage]': {
      description: 'Subscription payload entity',
      type: 'object',
      properties: {
        SequenceNumber: {
          format: 'int32',
          description: 'Sequence number',
          type: 'integer',
        },
        ChangeType: {
          description: 'Change type',
          type: 'string',
        },
        ClientState: {
          description: 'Client state',
          type: 'string',
        },
        Resource: {
          description: 'Resource',
          type: 'string',
        },
        ResourceData: {
          $ref: '#/definitions/OutlookReceiveMessage',
        },
      },
    },
    OutlookReceiveMessage: {
      description: 'Received message from outlook rest api',
      type: 'object',
      properties: {
        InternetMessageId: {
          description: 'Internet Message Id',
          type: 'string',
        },
        BodyPreview: {
          description: 'Body preview',
          type: 'string',
        },
        Id: {
          description: 'Id',
          type: 'string',
        },
        ConversationId: {
          description: 'Conversation Id',
          type: 'string',
        },
        HasAttachments: {
          description: 'Has attachments',
          type: 'boolean',
        },
        IsRead: {
          description: 'Is read',
          type: 'boolean',
        },
        CreatedDateTime: {
          format: 'date-time',
          description: 'Created date and time',
          type: 'string',
        },
        ReceivedDateTime: {
          format: 'date-time',
          description: 'Received date and time',
          type: 'string',
        },
        LastModifiedDateTime: {
          format: 'date-time',
          description: 'Last modified date and time',
          type: 'string',
        },
        Attachments: {
          description: 'Attachments',
          type: 'array',
          items: {
            $ref: '#/definitions/OutlookReceiveAttachment',
          },
        },
        ToRecipients: {
          description: 'To Recipient',
          type: 'array',
          items: {
            $ref: '#/definitions/Recipient',
          },
        },
        CcRecipients: {
          description: 'Cc Recipients',
          type: 'array',
          items: {
            $ref: '#/definitions/Recipient',
          },
        },
        BccRecipients: {
          description: 'Bcc Recipients',
          type: 'array',
          items: {
            $ref: '#/definitions/Recipient',
          },
        },
        ReplyTo: {
          description: 'The email addresses to use when replying',
          type: 'array',
          items: {
            $ref: '#/definitions/Recipient',
          },
        },
        Subject: {
          description: 'Subject',
          type: 'string',
        },
        Body: {
          $ref: '#/definitions/ItemBody',
        },
        From: {
          $ref: '#/definitions/Recipient',
        },
        Importance: {
          description: 'Importance',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
        },
        InternetMessageHeaders: {
          description: 'Internet message headers',
          type: 'array',
          items: {
            $ref: '#/definitions/InternetMessageHeader',
          },
        },
      },
    },
    OutlookReceiveAttachment: {
      description: 'Attachment',
      type: 'object',
      properties: {
        '@odata.type': {
          description: 'OData type',
          type: 'string',
        },
        Id: {
          description: 'Attachment Id',
          type: 'string',
        },
        Name: {
          description: 'Attachment name',
          type: 'string',
        },
        ContentBytes: {
          description: 'Attachment content',
          type: 'string',
        },
        ContentType: {
          description: 'Attachment content type',
          type: 'string',
        },
        Size: {
          format: 'int64',
          description: 'Attachment size in bytes',
          type: 'integer',
        },
        Permission: {
          description: 'Permission associated with a reference attachment',
          type: 'string',
        },
        ProviderType: {
          description: 'Provider for the reference attachment',
          type: 'string',
        },
        SourceUrl: {
          description: 'Reference attachment source url',
          type: 'string',
        },
        IsInline: {
          description: 'Set to true if this is an inline attachment',
          type: 'boolean',
        },
        LastModifiedDateTime: {
          format: 'date-time',
          description: 'The date and time when the attachment was last modified',
          type: 'string',
        },
        ContentId: {
          description: 'Content Id',
          type: 'string',
        },
      },
    },
    InternetMessageHeader: {
      description: 'Class representing a data structure for an Internet message header which is considered as SMTP header by Exchange',
      type: 'object',
      properties: {
        Name: {
          description: 'Header name',
          type: 'string',
        },
        Value: {
          description: 'Header value',
          type: 'string',
        },
      },
    },
    'SubscriptionPayload[SubscriptionEvent]': {
      description: 'Payload from backend containing subscription metadata as well as data',
      type: 'object',
      properties: {
        value: {
          description: 'List of values',
          type: 'array',
          items: {
            $ref: '#/definitions/SubscriptionPayloadEntity[SubscriptionEvent]',
          },
        },
      },
    },
    'SubscriptionPayloadEntity[SubscriptionEvent]': {
      description: 'Subscription payload entity',
      type: 'object',
      properties: {
        SequenceNumber: {
          format: 'int32',
          description: 'Sequence number',
          type: 'integer',
        },
        ChangeType: {
          description: 'Change type',
          type: 'string',
        },
        ClientState: {
          description: 'Client state',
          type: 'string',
        },
        Resource: {
          description: 'Resource',
          type: 'string',
        },
        ResourceData: {
          $ref: '#/definitions/SubscriptionEvent',
        },
      },
    },
    SubscriptionEvent: {
      description: 'Subscription event',
      type: 'object',
      properties: {
        Id: {
          description: "The Event's unique identifier",
          type: 'string',
        },
      },
    },
    'EntityListResponse[Table]': {
      description: 'Entity list response',
      type: 'object',
      properties: {
        value: {
          description: 'List of values',
          type: 'array',
          items: {
            $ref: '#/definitions/Table',
          },
        },
      },
    },
    Table: {
      description: 'Represents a table.',
      type: 'object',
      properties: {
        Name: {
          description: 'The name of the table. The name is used at runtime.',
          type: 'string',
        },
        DisplayName: {
          description: 'The display name of the table.',
          type: 'string',
        },
        DynamicProperties: {
          description: 'Additional table properties provided by the connector to the clients.',
          type: 'object',
          additionalProperties: {
            $ref: '#/definitions/Object',
          },
          readOnly: true,
        },
      },
    },
    'EntityListResponse[CalendarEventBackend]': {
      description: 'Entity list response',
      type: 'object',
      properties: {
        value: {
          description: 'List of values',
          type: 'array',
          items: {
            $ref: '#/definitions/CalendarEventBackend',
          },
        },
      },
    },
    'EntityListResponse[CalendarEventClientReceiveStringEnums]': {
      description: 'Entity list response',
      type: 'object',
      properties: {
        value: {
          description: 'List of values',
          type: 'array',
          items: {
            $ref: '#/definitions/CalendarEventClientReceiveStringEnums',
          },
        },
      },
    },
    'EntityListResponse[GraphCalendarEventClientReceive]': {
      description: 'Entity list response',
      type: 'object',
      properties: {
        value: {
          description: 'List of values',
          type: 'array',
          items: {
            $ref: '#/definitions/GraphCalendarEventClientReceive',
          },
        },
      },
    },
    CalendarEventClient: {
      description: 'Connector specific calendar event model class for the client',
      required: ['Subject', 'Start', 'End'],
      type: 'object',
      properties: {
        Subject: {
          description: 'Event subject',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Start: {
          format: 'date-time',
          description: "Start time of the event (example: '2016-11-01T14:30:00Z')",
          type: 'string',
          'x-ms-summary': 'Start time',
        },
        End: {
          format: 'date-time',
          description: "End time of the event (example: '2016-11-01T15:30:00Z')",
          type: 'string',
          'x-ms-summary': 'End time',
        },
        TimeZone: {
          description: 'Time zone of the event',
          enum: [
            '',
            '(UTC-12:00) International Date Line West',
            '(UTC-11:00) Coordinated Universal Time-11',
            '(UTC-10:00) Aleutian Islands',
            '(UTC-10:00) Hawaii',
            '(UTC-09:30) Marquesas Islands',
            '(UTC-09:00) Alaska',
            '(UTC-09:00) Coordinated Universal Time-09',
            '(UTC-08:00) Baja California',
            '(UTC-08:00) Coordinated Universal Time-08',
            '(UTC-08:00) Pacific Time (US & Canada)',
            '(UTC-07:00) Arizona',
            '(UTC-07:00) Chihuahua, La Paz, Mazatlan',
            '(UTC-07:00) Mountain Time (US & Canada)',
            '(UTC-06:00) Central America',
            '(UTC-06:00) Central Time (US & Canada)',
            '(UTC-06:00) Easter Island',
            '(UTC-06:00) Guadalajara, Mexico City, Monterrey',
            '(UTC-06:00) Saskatchewan',
            '(UTC-05:00) Bogota, Lima, Quito, Rio Branco',
            '(UTC-05:00) Chetumal',
            '(UTC-05:00) Eastern Time (US & Canada)',
            '(UTC-05:00) Haiti',
            '(UTC-05:00) Havana',
            '(UTC-05:00) Indiana (East)',
            '(UTC-04:00) Asuncion',
            '(UTC-04:00) Atlantic Time (Canada)',
            '(UTC-04:00) Caracas',
            '(UTC-04:00) Cuiaba',
            '(UTC-04:00) Georgetown, La Paz, Manaus, San Juan',
            '(UTC-04:00) Santiago',
            '(UTC-04:00) Turks and Caicos',
            '(UTC-03:30) Newfoundland',
            '(UTC-03:00) Araguaina',
            '(UTC-03:00) Brasilia',
            '(UTC-03:00) Cayenne, Fortaleza',
            '(UTC-03:00) City of Buenos Aires',
            '(UTC-03:00) Greenland',
            '(UTC-03:00) Montevideo',
            '(UTC-03:00) Punta Arenas',
            '(UTC-03:00) Saint Pierre and Miquelon',
            '(UTC-03:00) Salvador',
            '(UTC-02:00) Coordinated Universal Time-02',
            '(UTC-02:00) Mid-Atlantic - Old',
            '(UTC-01:00) Azores',
            '(UTC-01:00) Cabo Verde Is.',
            '(UTC) Coordinated Universal Time',
            '(UTC+00:00) Casablanca',
            '(UTC+00:00) Dublin, Edinburgh, Lisbon, London',
            '(UTC+00:00) Monrovia, Reykjavik',
            '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna',
            '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague',
            '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris',
            '(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb',
            '(UTC+01:00) West Central Africa',
            '(UTC+01:00) Windhoek',
            '(UTC+02:00) Amman',
            '(UTC+02:00) Athens, Bucharest',
            '(UTC+02:00) Beirut',
            '(UTC+02:00) Cairo',
            '(UTC+02:00) Chisinau',
            '(UTC+02:00) Damascus',
            '(UTC+02:00) Gaza, Hebron',
            '(UTC+02:00) Harare, Pretoria',
            '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
            '(UTC+02:00) Jerusalem',
            '(UTC+02:00) Kaliningrad',
            '(UTC+02:00) Tripoli',
            '(UTC+03:00) Baghdad',
            '(UTC+03:00) Istanbul',
            '(UTC+03:00) Kuwait, Riyadh',
            '(UTC+03:00) Minsk',
            '(UTC+03:00) Moscow, St. Petersburg',
            '(UTC+03:00) Nairobi',
            '(UTC+03:30) Tehran',
            '(UTC+04:00) Abu Dhabi, Muscat',
            '(UTC+04:00) Astrakhan, Ulyanovsk',
            '(UTC+04:00) Baku',
            '(UTC+04:00) Izhevsk, Samara',
            '(UTC+04:00) Port Louis',
            '(UTC+04:00) Saratov',
            '(UTC+04:00) Tbilisi',
            '(UTC+04:00) Volgograd',
            '(UTC+04:00) Yerevan',
            '(UTC+04:30) Kabul',
            '(UTC+05:00) Ashgabat, Tashkent',
            '(UTC+05:00) Ekaterinburg',
            '(UTC+05:00) Islamabad, Karachi',
            '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
            '(UTC+05:30) Sri Jayawardenepura',
            '(UTC+05:45) Kathmandu',
            '(UTC+06:00) Astana',
            '(UTC+06:00) Dhaka',
            '(UTC+06:00) Omsk',
            '(UTC+06:30) Yangon (Rangoon)',
            '(UTC+07:00) Bangkok, Hanoi, Jakarta',
            '(UTC+07:00) Barnaul, Gorno-Altaysk',
            '(UTC+07:00) Hovd',
            '(UTC+07:00) Krasnoyarsk',
            '(UTC+07:00) Novosibirsk',
            '(UTC+07:00) Tomsk',
            '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi',
            '(UTC+08:00) Irkutsk',
            '(UTC+08:00) Kuala Lumpur, Singapore',
            '(UTC+08:00) Perth',
            '(UTC+08:00) Taipei',
            '(UTC+08:00) Ulaanbaatar',
            '(UTC+08:30) Pyongyang',
            '(UTC+08:45) Eucla',
            '(UTC+09:00) Chita',
            '(UTC+09:00) Osaka, Sapporo, Tokyo',
            '(UTC+09:00) Seoul',
            '(UTC+09:00) Yakutsk',
            '(UTC+09:30) Adelaide',
            '(UTC+09:30) Darwin',
            '(UTC+10:00) Brisbane',
            '(UTC+10:00) Canberra, Melbourne, Sydney',
            '(UTC+10:00) Guam, Port Moresby',
            '(UTC+10:00) Hobart',
            '(UTC+10:00) Vladivostok',
            '(UTC+10:30) Lord Howe Island',
            '(UTC+11:00) Bougainville Island',
            '(UTC+11:00) Chokurdakh',
            '(UTC+11:00) Magadan',
            '(UTC+11:00) Norfolk Island',
            '(UTC+11:00) Sakhalin',
            '(UTC+11:00) Solomon Is., New Caledonia',
            '(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky',
            '(UTC+12:00) Auckland, Wellington',
            '(UTC+12:00) Coordinated Universal Time+12',
            '(UTC+12:00) Fiji',
            '(UTC+12:00) Petropavlovsk-Kamchatsky - Old',
            '(UTC+12:45) Chatham Islands',
            '(UTC+13:00) Coordinated Universal Time+13',
            "(UTC+13:00) Nuku'alofa",
            '(UTC+13:00) Samoa',
            '(UTC+14:00) Kiritimati Island',
          ],
          type: 'string',
          'x-ms-summary': 'Time zone',
          'x-ms-visibility': 'advanced',
        },
        RequiredAttendees: {
          format: 'email',
          description: 'Required attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Required attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        OptionalAttendees: {
          format: 'email',
          description: 'Optional attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Optional attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        ResourceAttendees: {
          description: 'Resource attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Resource attendees',
          'x-ms-visibility': 'advanced',
        },
        Body: {
          description: 'Body of the message associated with the event',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'advanced',
        },
        IsHtml: {
          description: 'Set to true if the body is Html',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
        Location: {
          description: 'Location of the event',
          type: 'string',
          'x-ms-summary': 'Location',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          description: 'The importance of the event: Low, Normal, or High',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        IsAllDay: {
          description: 'Set to true if the event lasts all day',
          type: 'boolean',
          'x-ms-summary': 'Is all day event?',
          'x-ms-visibility': 'advanced',
        },
        Recurrence: {
          description: 'The recurrence pattern for the event',
          enum: ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'],
          type: 'string',
          'x-ms-summary': 'Recurrence',
          'x-ms-visibility': 'advanced',
        },
        RecurrenceEnd: {
          format: 'date-time',
          description: 'End time of the recurrence',
          type: 'string',
          'x-ms-summary': 'Recurrence end time',
          'x-ms-visibility': 'advanced',
        },
        NumberOfOccurrences: {
          format: 'int32',
          description: 'How many times to repeat the event',
          type: 'integer',
          'x-ms-summary': 'Number of occurrences',
          'x-ms-visibility': 'advanced',
        },
        Reminder: {
          format: 'int32',
          description: 'Time in minutes before event start to remind',
          type: 'integer',
          'x-ms-summary': 'Reminder',
          'x-ms-visibility': 'advanced',
        },
        ShowAs: {
          description: 'Status to show during the event',
          enum: ['Free', 'Tentative', 'Busy', 'Oof', 'WorkingElsewhere', 'Unknown'],
          type: 'string',
          'x-ms-summary': 'Show as',
          'x-ms-visibility': 'advanced',
        },
        ResponseRequested: {
          description: 'Set to true if the sender would like a response when the event is accepted or declined',
          type: 'boolean',
          'x-ms-summary': 'Response requested',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    CalendarEventHtmlClient: {
      description: 'Connector specific calendar event model class for the html client',
      required: ['Subject', 'Start', 'End'],
      type: 'object',
      properties: {
        Subject: {
          description: 'Event subject',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Start: {
          format: 'date-time',
          description: "Start time of the event (example: '2016-11-01T14:30:00Z')",
          type: 'string',
          'x-ms-summary': 'Start time',
        },
        End: {
          format: 'date-time',
          description: "End time of the event (example: '2016-11-01T15:30:00Z')",
          type: 'string',
          'x-ms-summary': 'End time',
        },
        TimeZone: {
          description: 'Time zone of the event',
          enum: [
            '',
            '(UTC-12:00) International Date Line West',
            '(UTC-11:00) Coordinated Universal Time-11',
            '(UTC-10:00) Aleutian Islands',
            '(UTC-10:00) Hawaii',
            '(UTC-09:30) Marquesas Islands',
            '(UTC-09:00) Alaska',
            '(UTC-09:00) Coordinated Universal Time-09',
            '(UTC-08:00) Baja California',
            '(UTC-08:00) Coordinated Universal Time-08',
            '(UTC-08:00) Pacific Time (US & Canada)',
            '(UTC-07:00) Arizona',
            '(UTC-07:00) Chihuahua, La Paz, Mazatlan',
            '(UTC-07:00) Mountain Time (US & Canada)',
            '(UTC-06:00) Central America',
            '(UTC-06:00) Central Time (US & Canada)',
            '(UTC-06:00) Easter Island',
            '(UTC-06:00) Guadalajara, Mexico City, Monterrey',
            '(UTC-06:00) Saskatchewan',
            '(UTC-05:00) Bogota, Lima, Quito, Rio Branco',
            '(UTC-05:00) Chetumal',
            '(UTC-05:00) Eastern Time (US & Canada)',
            '(UTC-05:00) Haiti',
            '(UTC-05:00) Havana',
            '(UTC-05:00) Indiana (East)',
            '(UTC-04:00) Asuncion',
            '(UTC-04:00) Atlantic Time (Canada)',
            '(UTC-04:00) Caracas',
            '(UTC-04:00) Cuiaba',
            '(UTC-04:00) Georgetown, La Paz, Manaus, San Juan',
            '(UTC-04:00) Santiago',
            '(UTC-04:00) Turks and Caicos',
            '(UTC-03:30) Newfoundland',
            '(UTC-03:00) Araguaina',
            '(UTC-03:00) Brasilia',
            '(UTC-03:00) Cayenne, Fortaleza',
            '(UTC-03:00) City of Buenos Aires',
            '(UTC-03:00) Greenland',
            '(UTC-03:00) Montevideo',
            '(UTC-03:00) Punta Arenas',
            '(UTC-03:00) Saint Pierre and Miquelon',
            '(UTC-03:00) Salvador',
            '(UTC-02:00) Coordinated Universal Time-02',
            '(UTC-02:00) Mid-Atlantic - Old',
            '(UTC-01:00) Azores',
            '(UTC-01:00) Cabo Verde Is.',
            '(UTC) Coordinated Universal Time',
            '(UTC+00:00) Casablanca',
            '(UTC+00:00) Dublin, Edinburgh, Lisbon, London',
            '(UTC+00:00) Monrovia, Reykjavik',
            '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna',
            '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague',
            '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris',
            '(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb',
            '(UTC+01:00) West Central Africa',
            '(UTC+01:00) Windhoek',
            '(UTC+02:00) Amman',
            '(UTC+02:00) Athens, Bucharest',
            '(UTC+02:00) Beirut',
            '(UTC+02:00) Cairo',
            '(UTC+02:00) Chisinau',
            '(UTC+02:00) Damascus',
            '(UTC+02:00) Gaza, Hebron',
            '(UTC+02:00) Harare, Pretoria',
            '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
            '(UTC+02:00) Jerusalem',
            '(UTC+02:00) Kaliningrad',
            '(UTC+02:00) Tripoli',
            '(UTC+03:00) Baghdad',
            '(UTC+03:00) Istanbul',
            '(UTC+03:00) Kuwait, Riyadh',
            '(UTC+03:00) Minsk',
            '(UTC+03:00) Moscow, St. Petersburg',
            '(UTC+03:00) Nairobi',
            '(UTC+03:30) Tehran',
            '(UTC+04:00) Abu Dhabi, Muscat',
            '(UTC+04:00) Astrakhan, Ulyanovsk',
            '(UTC+04:00) Baku',
            '(UTC+04:00) Izhevsk, Samara',
            '(UTC+04:00) Port Louis',
            '(UTC+04:00) Saratov',
            '(UTC+04:00) Tbilisi',
            '(UTC+04:00) Volgograd',
            '(UTC+04:00) Yerevan',
            '(UTC+04:30) Kabul',
            '(UTC+05:00) Ashgabat, Tashkent',
            '(UTC+05:00) Ekaterinburg',
            '(UTC+05:00) Islamabad, Karachi',
            '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
            '(UTC+05:30) Sri Jayawardenepura',
            '(UTC+05:45) Kathmandu',
            '(UTC+06:00) Astana',
            '(UTC+06:00) Dhaka',
            '(UTC+06:00) Omsk',
            '(UTC+06:30) Yangon (Rangoon)',
            '(UTC+07:00) Bangkok, Hanoi, Jakarta',
            '(UTC+07:00) Barnaul, Gorno-Altaysk',
            '(UTC+07:00) Hovd',
            '(UTC+07:00) Krasnoyarsk',
            '(UTC+07:00) Novosibirsk',
            '(UTC+07:00) Tomsk',
            '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi',
            '(UTC+08:00) Irkutsk',
            '(UTC+08:00) Kuala Lumpur, Singapore',
            '(UTC+08:00) Perth',
            '(UTC+08:00) Taipei',
            '(UTC+08:00) Ulaanbaatar',
            '(UTC+08:30) Pyongyang',
            '(UTC+08:45) Eucla',
            '(UTC+09:00) Chita',
            '(UTC+09:00) Osaka, Sapporo, Tokyo',
            '(UTC+09:00) Seoul',
            '(UTC+09:00) Yakutsk',
            '(UTC+09:30) Adelaide',
            '(UTC+09:30) Darwin',
            '(UTC+10:00) Brisbane',
            '(UTC+10:00) Canberra, Melbourne, Sydney',
            '(UTC+10:00) Guam, Port Moresby',
            '(UTC+10:00) Hobart',
            '(UTC+10:00) Vladivostok',
            '(UTC+10:30) Lord Howe Island',
            '(UTC+11:00) Bougainville Island',
            '(UTC+11:00) Chokurdakh',
            '(UTC+11:00) Magadan',
            '(UTC+11:00) Norfolk Island',
            '(UTC+11:00) Sakhalin',
            '(UTC+11:00) Solomon Is., New Caledonia',
            '(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky',
            '(UTC+12:00) Auckland, Wellington',
            '(UTC+12:00) Coordinated Universal Time+12',
            '(UTC+12:00) Fiji',
            '(UTC+12:00) Petropavlovsk-Kamchatsky - Old',
            '(UTC+12:45) Chatham Islands',
            '(UTC+13:00) Coordinated Universal Time+13',
            "(UTC+13:00) Nuku'alofa",
            '(UTC+13:00) Samoa',
            '(UTC+14:00) Kiritimati Island',
          ],
          type: 'string',
          'x-ms-summary': 'Time zone',
          'x-ms-visibility': 'advanced',
        },
        RequiredAttendees: {
          format: 'email',
          description: 'Required attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Required attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        OptionalAttendees: {
          format: 'email',
          description: 'Optional attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Optional attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        ResourceAttendees: {
          description: 'Resource attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Resource attendees',
          'x-ms-visibility': 'advanced',
        },
        Body: {
          format: 'html',
          description: 'Body of the message associated with the event',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'advanced',
        },
        Location: {
          description: 'Location of the event',
          type: 'string',
          'x-ms-summary': 'Location',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          description: 'The importance of the event: Low, Normal, or High',
          enum: ['Low', 'Normal', 'High'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        IsAllDay: {
          description: 'Set to true if the event lasts all day',
          type: 'boolean',
          'x-ms-summary': 'Is all day event?',
          'x-ms-visibility': 'advanced',
        },
        Recurrence: {
          description: 'The recurrence pattern for the event',
          enum: ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'],
          type: 'string',
          'x-ms-summary': 'Recurrence',
          'x-ms-visibility': 'advanced',
        },
        RecurrenceEnd: {
          format: 'date-time',
          description: 'End time of the recurrence',
          type: 'string',
          'x-ms-summary': 'Recurrence end time',
          'x-ms-visibility': 'advanced',
        },
        NumberOfOccurrences: {
          format: 'int32',
          description: 'How many times to repeat the event',
          type: 'integer',
          'x-ms-summary': 'Number of occurrences',
          'x-ms-visibility': 'advanced',
        },
        Reminder: {
          format: 'int32',
          description: 'Time in minutes before event start to remind',
          type: 'integer',
          'x-ms-summary': 'Reminder',
          'x-ms-visibility': 'advanced',
        },
        ShowAs: {
          description: 'Status to show during the event',
          enum: ['Free', 'Tentative', 'Busy', 'Oof', 'WorkingElsewhere', 'Unknown'],
          type: 'string',
          'x-ms-summary': 'Show as',
          'x-ms-visibility': 'advanced',
        },
        ResponseRequested: {
          description: 'Set to true if the sender would like a response when the event is accepted or declined',
          type: 'boolean',
          'x-ms-summary': 'Response requested',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    GraphCalendarEventClient: {
      description: 'Connector specific calendar event model class for the client for graph API',
      required: ['subject', 'start', 'end', 'timeZone'],
      type: 'object',
      properties: {
        subject: {
          description: 'Event subject',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        start: {
          format: 'date-no-tz',
          description: "Start time of the event (example: '2017-08-29T04:00:00')",
          type: 'string',
          'x-ms-summary': 'Start time',
        },
        end: {
          format: 'date-no-tz',
          description: "End time of the event (example: '2017-08-29T05:00:00')",
          type: 'string',
          'x-ms-summary': 'End time',
        },
        timeZone: {
          description: 'Time zone of the event',
          enum: [
            '',
            '(UTC-12:00) International Date Line West',
            '(UTC-11:00) Coordinated Universal Time-11',
            '(UTC-10:00) Aleutian Islands',
            '(UTC-10:00) Hawaii',
            '(UTC-09:30) Marquesas Islands',
            '(UTC-09:00) Alaska',
            '(UTC-09:00) Coordinated Universal Time-09',
            '(UTC-08:00) Baja California',
            '(UTC-08:00) Coordinated Universal Time-08',
            '(UTC-08:00) Pacific Time (US & Canada)',
            '(UTC-07:00) Arizona',
            '(UTC-07:00) Chihuahua, La Paz, Mazatlan',
            '(UTC-07:00) Mountain Time (US & Canada)',
            '(UTC-06:00) Central America',
            '(UTC-06:00) Central Time (US & Canada)',
            '(UTC-06:00) Easter Island',
            '(UTC-06:00) Guadalajara, Mexico City, Monterrey',
            '(UTC-06:00) Saskatchewan',
            '(UTC-05:00) Bogota, Lima, Quito, Rio Branco',
            '(UTC-05:00) Chetumal',
            '(UTC-05:00) Eastern Time (US & Canada)',
            '(UTC-05:00) Haiti',
            '(UTC-05:00) Havana',
            '(UTC-05:00) Indiana (East)',
            '(UTC-04:00) Asuncion',
            '(UTC-04:00) Atlantic Time (Canada)',
            '(UTC-04:00) Caracas',
            '(UTC-04:00) Cuiaba',
            '(UTC-04:00) Georgetown, La Paz, Manaus, San Juan',
            '(UTC-04:00) Santiago',
            '(UTC-04:00) Turks and Caicos',
            '(UTC-03:30) Newfoundland',
            '(UTC-03:00) Araguaina',
            '(UTC-03:00) Brasilia',
            '(UTC-03:00) Cayenne, Fortaleza',
            '(UTC-03:00) City of Buenos Aires',
            '(UTC-03:00) Greenland',
            '(UTC-03:00) Montevideo',
            '(UTC-03:00) Punta Arenas',
            '(UTC-03:00) Saint Pierre and Miquelon',
            '(UTC-03:00) Salvador',
            '(UTC-02:00) Coordinated Universal Time-02',
            '(UTC-02:00) Mid-Atlantic - Old',
            '(UTC-01:00) Azores',
            '(UTC-01:00) Cabo Verde Is.',
            '(UTC) Coordinated Universal Time',
            '(UTC+00:00) Casablanca',
            '(UTC+00:00) Dublin, Edinburgh, Lisbon, London',
            '(UTC+00:00) Monrovia, Reykjavik',
            '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna',
            '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague',
            '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris',
            '(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb',
            '(UTC+01:00) West Central Africa',
            '(UTC+01:00) Windhoek',
            '(UTC+02:00) Amman',
            '(UTC+02:00) Athens, Bucharest',
            '(UTC+02:00) Beirut',
            '(UTC+02:00) Cairo',
            '(UTC+02:00) Chisinau',
            '(UTC+02:00) Damascus',
            '(UTC+02:00) Gaza, Hebron',
            '(UTC+02:00) Harare, Pretoria',
            '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
            '(UTC+02:00) Jerusalem',
            '(UTC+02:00) Kaliningrad',
            '(UTC+02:00) Tripoli',
            '(UTC+03:00) Baghdad',
            '(UTC+03:00) Istanbul',
            '(UTC+03:00) Kuwait, Riyadh',
            '(UTC+03:00) Minsk',
            '(UTC+03:00) Moscow, St. Petersburg',
            '(UTC+03:00) Nairobi',
            '(UTC+03:30) Tehran',
            '(UTC+04:00) Abu Dhabi, Muscat',
            '(UTC+04:00) Astrakhan, Ulyanovsk',
            '(UTC+04:00) Baku',
            '(UTC+04:00) Izhevsk, Samara',
            '(UTC+04:00) Port Louis',
            '(UTC+04:00) Saratov',
            '(UTC+04:00) Tbilisi',
            '(UTC+04:00) Volgograd',
            '(UTC+04:00) Yerevan',
            '(UTC+04:30) Kabul',
            '(UTC+05:00) Ashgabat, Tashkent',
            '(UTC+05:00) Ekaterinburg',
            '(UTC+05:00) Islamabad, Karachi',
            '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
            '(UTC+05:30) Sri Jayawardenepura',
            '(UTC+05:45) Kathmandu',
            '(UTC+06:00) Astana',
            '(UTC+06:00) Dhaka',
            '(UTC+06:00) Omsk',
            '(UTC+06:30) Yangon (Rangoon)',
            '(UTC+07:00) Bangkok, Hanoi, Jakarta',
            '(UTC+07:00) Barnaul, Gorno-Altaysk',
            '(UTC+07:00) Hovd',
            '(UTC+07:00) Krasnoyarsk',
            '(UTC+07:00) Novosibirsk',
            '(UTC+07:00) Tomsk',
            '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi',
            '(UTC+08:00) Irkutsk',
            '(UTC+08:00) Kuala Lumpur, Singapore',
            '(UTC+08:00) Perth',
            '(UTC+08:00) Taipei',
            '(UTC+08:00) Ulaanbaatar',
            '(UTC+08:30) Pyongyang',
            '(UTC+08:45) Eucla',
            '(UTC+09:00) Chita',
            '(UTC+09:00) Osaka, Sapporo, Tokyo',
            '(UTC+09:00) Seoul',
            '(UTC+09:00) Yakutsk',
            '(UTC+09:30) Adelaide',
            '(UTC+09:30) Darwin',
            '(UTC+10:00) Brisbane',
            '(UTC+10:00) Canberra, Melbourne, Sydney',
            '(UTC+10:00) Guam, Port Moresby',
            '(UTC+10:00) Hobart',
            '(UTC+10:00) Vladivostok',
            '(UTC+10:30) Lord Howe Island',
            '(UTC+11:00) Bougainville Island',
            '(UTC+11:00) Chokurdakh',
            '(UTC+11:00) Magadan',
            '(UTC+11:00) Norfolk Island',
            '(UTC+11:00) Sakhalin',
            '(UTC+11:00) Solomon Is., New Caledonia',
            '(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky',
            '(UTC+12:00) Auckland, Wellington',
            '(UTC+12:00) Coordinated Universal Time+12',
            '(UTC+12:00) Fiji',
            '(UTC+12:00) Petropavlovsk-Kamchatsky - Old',
            '(UTC+12:45) Chatham Islands',
            '(UTC+13:00) Coordinated Universal Time+13',
            "(UTC+13:00) Nuku'alofa",
            '(UTC+13:00) Samoa',
            '(UTC+14:00) Kiritimati Island',
          ],
          type: 'string',
          'x-ms-summary': 'Time zone',
        },
        requiredAttendees: {
          format: 'email',
          description: 'Required attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Required attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        optionalAttendees: {
          format: 'email',
          description: 'Optional attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Optional attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        resourceAttendees: {
          description: 'Resource attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Resource attendees',
          'x-ms-visibility': 'advanced',
        },
        body: {
          format: 'html',
          description: 'Body of the message associated with the event',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'advanced',
        },
        location: {
          description: 'Location of the event',
          type: 'string',
          'x-ms-summary': 'Location',
          'x-ms-visibility': 'advanced',
        },
        importance: {
          description: 'The importance of the event: low, normal, or high',
          enum: ['low', 'normal', 'high'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        isAllDay: {
          description: 'Set to true if the event lasts all day',
          type: 'boolean',
          'x-ms-summary': 'Is all day event?',
          'x-ms-visibility': 'advanced',
        },
        recurrence: {
          description: 'The recurrence pattern for the event: none, daily, weekly, monthly or yearly',
          enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
          type: 'string',
          'x-ms-summary': 'Recurrence',
          'x-ms-visibility': 'advanced',
        },
        selectedDaysOfWeek: {
          description: 'Days of week for weekly recurrence',
          type: 'array',
          items: {
            type: 'string',
            enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          },
          'x-ms-summary': 'Selected days of week',
          'x-ms-visibility': 'advanced',
        },
        recurrenceEnd: {
          format: 'date',
          description: 'End Date of the recurrence',
          type: 'string',
          'x-ms-summary': 'Recurrence end date',
          'x-ms-visibility': 'advanced',
        },
        numberOfOccurences: {
          format: 'int32',
          description: 'How many times to repeat the event',
          type: 'integer',
          'x-ms-summary': 'Number of occurrences',
          'x-ms-visibility': 'advanced',
        },
        reminderMinutesBeforeStart: {
          format: 'int32',
          description: 'Time in minutes before event start to remind',
          type: 'integer',
          'x-ms-summary': 'Reminder',
          'x-ms-visibility': 'advanced',
        },
        isReminderOn: {
          description: 'Set to true if an alert is set to remind the user of the event.',
          type: 'boolean',
          'x-ms-summary': 'Is reminder on',
          'x-ms-visibility': 'advanced',
        },
        showAs: {
          description: 'Status to show during the event: free, tentative, busy, oof, workingElsewhere or unknown',
          enum: ['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown'],
          type: 'string',
          'x-ms-summary': 'Show as',
          'x-ms-visibility': 'advanced',
        },
        responseRequested: {
          description: 'Set to true if the sender would like a response when the event is accepted or declined',
          type: 'boolean',
          'x-ms-summary': 'Response requested',
          'x-ms-visibility': 'advanced',
        },
        sensitivity: {
          description: 'The possible values are: normal, personal, private, confidential',
          enum: ['normal', 'personal', 'private', 'confidential'],
          type: 'string',
          'x-ms-summary': 'Sensitivity',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    CalendarEventListWithActionType: {
      description: 'The list of calendar items with action type',
      type: 'object',
      properties: {
        value: {
          description: 'List of calendar items',
          type: 'array',
          items: {
            $ref: '#/definitions/CalendarEventClientWithActionType',
          },
        },
      },
    },
    CalendarEventClientWithActionType: {
      description: 'Calendar event model with action type',
      type: 'object',
      properties: {
        ActionType: {
          description: 'Changed action type of the event - added, updated or deleted.',
          enum: ['added', 'updated', 'deleted'],
          type: 'string',
          'x-ms-summary': 'Action Type',
          'x-ms-visibility': 'advanced',
        },
        IsAdded: {
          description: 'Flag that indicates whether the event was added since the last poll of the trigger.',
          type: 'boolean',
          'x-ms-summary': 'Is Added',
          'x-ms-visibility': 'advanced',
        },
        IsUpdated: {
          description: 'Flag that indicates whether the event was updated since the last poll of the trigger.',
          type: 'boolean',
          'x-ms-summary': 'Is Updated',
          'x-ms-visibility': 'advanced',
        },
        Subject: {
          description: 'Event subject',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        Start: {
          format: 'date-time',
          description: "Start time of the event (example: '2016-11-01T14:30:00Z')",
          type: 'string',
          'x-ms-summary': 'Start time',
        },
        End: {
          format: 'date-time',
          description: "End time of the event (example: '2016-11-01T15:30:00Z')",
          type: 'string',
          'x-ms-summary': 'End time',
        },
        ShowAs: {
          format: 'int32',
          description: 'Status to show during the event (Unknown - -1, Free - 0, Tentative - 1, Busy - 2, Oof - 3, WorkingElsewhere - 4)',
          type: 'integer',
          'x-ms-summary': 'Show as',
          'x-ms-visibility': 'advanced',
        },
        Recurrence: {
          format: 'int32',
          description: 'The recurrence pattern for the event (None - 0, Daily - 1, Weekly - 2, Monthly - 3, Yearly - 4)',
          type: 'integer',
          'x-ms-summary': 'Recurrence',
          'x-ms-visibility': 'advanced',
        },
        ResponseType: {
          format: 'int32',
          description:
            'The response type of the event (None - 0, Organizer - 1, TentativelyAccepted - 2, Accepted - 3, Declined - 4, NotResponded - 5)',
          type: 'integer',
          'x-ms-summary': 'Response type',
          'x-ms-visibility': 'advanced',
        },
        ResponseTime: {
          format: 'date-time',
          description: 'The response time of the event',
          type: 'string',
          'x-ms-summary': 'Response time',
          'x-ms-visibility': 'advanced',
        },
        ICalUId: {
          description: 'A unique identifier that is shared by all instances of an event across different calendars',
          type: 'string',
          'x-ms-summary': 'Event Unique ID',
          'x-ms-visibility': 'advanced',
        },
        Importance: {
          format: 'int32',
          description: 'The importance of the event (0 - Low, 1 - Normal, 2 - High)',
          type: 'integer',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        Id: {
          description: "The event's unique identifier",
          type: 'string',
          'x-ms-summary': 'Id',
          'x-ms-visibility': 'advanced',
        },
        DateTimeCreated: {
          format: 'date-time',
          description: 'The date and time that the event was created',
          type: 'string',
          'x-ms-summary': 'Created time',
          'x-ms-visibility': 'advanced',
        },
        DateTimeLastModified: {
          format: 'date-time',
          description: 'The date and time that the event was last modified',
          type: 'string',
          'x-ms-summary': 'Last modified time',
          'x-ms-visibility': 'advanced',
        },
        Organizer: {
          format: 'email',
          description: 'The organizer of the event',
          type: 'string',
          'x-ms-summary': 'Organizer',
          'x-ms-visibility': 'advanced',
        },
        TimeZone: {
          description: 'Time zone of the event',
          type: 'string',
          'x-ms-summary': 'Time zone',
          'x-ms-visibility': 'advanced',
        },
        SeriesMasterId: {
          description: 'Unique identifier for Series Master event type',
          type: 'string',
          'x-ms-summary': 'Series master id',
          'x-ms-visibility': 'advanced',
        },
        Categories: {
          description: 'The categories associated with the event',
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Categories',
          'x-ms-visibility': 'advanced',
        },
        WebLink: {
          format: 'uri',
          description: 'The URL to open the event in Outlook Web App',
          type: 'string',
          'x-ms-summary': 'Web link',
          'x-ms-visibility': 'advanced',
        },
        RequiredAttendees: {
          format: 'email',
          description: 'Required attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Required attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        OptionalAttendees: {
          format: 'email',
          description: 'Optional attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Optional attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        ResourceAttendees: {
          description: 'Resource attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Resource attendees',
          'x-ms-visibility': 'advanced',
        },
        Body: {
          description: 'Body of the message associated with the event',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'advanced',
        },
        IsHtml: {
          description: 'Set to true if the body is Html',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
        Location: {
          description: 'Location of the event',
          type: 'string',
          'x-ms-summary': 'Location',
          'x-ms-visibility': 'advanced',
        },
        IsAllDay: {
          description: 'Set to true if the event lasts all day',
          type: 'boolean',
          'x-ms-summary': 'Is all day event?',
          'x-ms-visibility': 'advanced',
        },
        RecurrenceEnd: {
          format: 'date-time',
          description: 'End time of the recurrence',
          type: 'string',
          'x-ms-summary': 'Recurrence end time',
          'x-ms-visibility': 'advanced',
        },
        NumberOfOccurrences: {
          format: 'int32',
          description: 'How many times to repeat the event',
          type: 'integer',
          'x-ms-summary': 'Number of occurrences',
          'x-ms-visibility': 'advanced',
        },
        Reminder: {
          format: 'int32',
          description: 'Time in minutes before event start to remind',
          type: 'integer',
          'x-ms-summary': 'Reminder',
          'x-ms-visibility': 'advanced',
        },
        ResponseRequested: {
          description: 'Set to true if the sender would like a response when the event is accepted or declined',
          type: 'boolean',
          'x-ms-summary': 'Response requested',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    GraphCalendarEventListWithActionType: {
      description: 'The list of calendar items with action type',
      type: 'object',
      properties: {
        value: {
          description: 'List of calendar items',
          type: 'array',
          items: {
            $ref: '#/definitions/GraphCalendarEventClientWithActionType',
          },
        },
      },
    },
    GraphCalendarEventClientWithActionType: {
      description: 'Graph calendar event model with action type',
      type: 'object',
      properties: {
        ActionType: {
          description: 'Changed action type of the event - added, updated or deleted.',
          enum: ['added', 'updated', 'deleted'],
          type: 'string',
          'x-ms-summary': 'Action Type',
          'x-ms-visibility': 'advanced',
        },
        IsAdded: {
          description: 'Flag that indicates whether the event was added since the last poll of the trigger.',
          type: 'boolean',
          'x-ms-summary': 'Is Added',
          'x-ms-visibility': 'advanced',
        },
        IsUpdated: {
          description: 'Flag that indicates whether the event was updated since the last poll of the trigger.',
          type: 'boolean',
          'x-ms-summary': 'Is Updated',
          'x-ms-visibility': 'advanced',
        },
        subject: {
          description: 'Event subject',
          type: 'string',
          'x-ms-summary': 'Subject',
        },
        start: {
          format: 'date-no-tz',
          description: "Start time of the event (example: '2017-08-29T04:00:00.0000000')",
          type: 'string',
          'x-ms-summary': 'Start time',
        },
        end: {
          format: 'date-no-tz',
          description: "End time of the event (example: '2017-08-29T05:00:00.0000000')",
          type: 'string',
          'x-ms-summary': 'End time',
        },
        startWithTimeZone: {
          format: 'date-time',
          description: "Start time of the event with time zone (example: '2017-08-29T04:00:00.0000000+00:00')",
          type: 'string',
          readOnly: true,
          'x-ms-summary': 'Start time with time zone',
        },
        endWithTimeZone: {
          format: 'date-time',
          description: "End time of the event with time zone (example: '2017-08-29T05:00:00.0000000+00:00')",
          type: 'string',
          readOnly: true,
          'x-ms-summary': 'End time with time zone',
        },
        body: {
          format: 'html',
          description: 'Body of the message associated with the event',
          type: 'string',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'advanced',
        },
        isHtml: {
          description: 'Set to true if the body is Html',
          type: 'boolean',
          'x-ms-summary': 'Is HTML',
          'x-ms-visibility': 'advanced',
        },
        responseType: {
          description: 'The response type of the event (none, organizer, tentativelyAccepted, accepted, declined or notResponded)',
          enum: ['none', 'organizer', 'tentativelyAccepted', 'accepted', 'declined', 'notResponded'],
          type: 'string',
          'x-ms-summary': 'Response type',
          'x-ms-visibility': 'advanced',
        },
        responseTime: {
          format: 'date-time',
          description: 'The response time of the event',
          type: 'string',
          'x-ms-summary': 'Response time',
          'x-ms-visibility': 'advanced',
        },
        id: {
          description: "The event's unique identifier",
          type: 'string',
          'x-ms-summary': 'Id',
          'x-ms-visibility': 'advanced',
        },
        createdDateTime: {
          format: 'date-time',
          description: 'The date and time that the event was created',
          type: 'string',
          'x-ms-summary': 'Created time',
          'x-ms-visibility': 'advanced',
        },
        lastModifiedDateTime: {
          format: 'date-time',
          description: 'The date and time that the event was last modified',
          type: 'string',
          'x-ms-summary': 'Last modified time',
          'x-ms-visibility': 'advanced',
        },
        organizer: {
          format: 'email',
          description: 'The organizer of the event',
          type: 'string',
          'x-ms-summary': 'Organizer',
          'x-ms-visibility': 'advanced',
        },
        timeZone: {
          description: 'Time zone of the event',
          type: 'string',
          'x-ms-summary': 'Time zone',
          'x-ms-visibility': 'advanced',
        },
        seriesMasterId: {
          description: 'Unique identifier for Series Master event type',
          type: 'string',
          'x-ms-summary': 'Series master id',
          'x-ms-visibility': 'advanced',
        },
        iCalUId: {
          description: 'A unique identifier for an event across calendars. This ID is different for each occurrence in a recurring series',
          type: 'string',
          'x-ms-summary': 'iCalUId',
          'x-ms-visibility': 'advanced',
        },
        categories: {
          description: 'The categories associated with the event',
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Categories',
          'x-ms-visibility': 'advanced',
        },
        webLink: {
          format: 'uri',
          description: 'The URL to open the event in Outlook Web App',
          type: 'string',
          'x-ms-summary': 'Web link',
          'x-ms-visibility': 'advanced',
        },
        requiredAttendees: {
          format: 'email',
          description: 'Required attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Required attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        optionalAttendees: {
          format: 'email',
          description: 'Optional attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Optional attendees',
          'x-ms-visibility': 'advanced',
          'x-ms-dynamic-values': {
            builtInOperation: 'AadGraph.GetUsers',
            parameters: {},
            'value-path': 'mail',
          },
        },
        resourceAttendees: {
          description: 'Resource attendees for the event separated by semicolons',
          type: 'string',
          'x-ms-summary': 'Resource attendees',
          'x-ms-visibility': 'advanced',
        },
        location: {
          description: 'Location of the event',
          type: 'string',
          'x-ms-summary': 'Location',
          'x-ms-visibility': 'advanced',
        },
        importance: {
          description: 'The importance of the event: low, normal, or high',
          enum: ['low', 'normal', 'high'],
          type: 'string',
          'x-ms-summary': 'Importance',
          'x-ms-visibility': 'advanced',
        },
        isAllDay: {
          description: 'Set to true if the event lasts all day',
          type: 'boolean',
          'x-ms-summary': 'Is all day event?',
          'x-ms-visibility': 'advanced',
        },
        recurrence: {
          description: 'The recurrence pattern for the event: none, daily, weekly, monthly or yearly',
          enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
          type: 'string',
          'x-ms-summary': 'Recurrence',
          'x-ms-visibility': 'advanced',
        },
        recurrenceEnd: {
          format: 'date',
          description: 'End Date of the recurrence',
          type: 'string',
          'x-ms-summary': 'Recurrence end date',
          'x-ms-visibility': 'advanced',
        },
        numberOfOccurences: {
          format: 'int32',
          description: 'How many times to repeat the event',
          type: 'integer',
          'x-ms-summary': 'Number of occurrences',
          'x-ms-visibility': 'advanced',
        },
        reminderMinutesBeforeStart: {
          format: 'int32',
          description: 'Time in minutes before event start to remind',
          type: 'integer',
          'x-ms-summary': 'Reminder',
          'x-ms-visibility': 'advanced',
        },
        isReminderOn: {
          description: 'Set to true if an alert is set to remind the user of the event.',
          type: 'boolean',
          'x-ms-summary': 'Is reminder on',
          'x-ms-visibility': 'advanced',
        },
        showAs: {
          description: 'Status to show during the event: free, tentative, busy, oof, workingElsewhere or unknown',
          enum: ['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown'],
          type: 'string',
          'x-ms-summary': 'Show as',
          'x-ms-visibility': 'advanced',
        },
        responseRequested: {
          description: 'Set to true if the sender would like a response when the event is accepted or declined',
          type: 'boolean',
          'x-ms-summary': 'Response requested',
          'x-ms-visibility': 'advanced',
        },
        sensitivity: {
          description: 'The possible values are: normal, personal, private, confidential',
          enum: ['normal', 'personal', 'private', 'confidential'],
          type: 'string',
          'x-ms-summary': 'Sensitivity',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    'EntityListResponse[GraphContactFolder]': {
      description: 'Entity list response',
      type: 'object',
      properties: {
        value: {
          description: 'List of values',
          type: 'array',
          items: {
            $ref: '#/definitions/GraphContactFolder',
          },
        },
      },
    },
    GraphContactFolder: {
      description: 'Contact folder data model returned by Graph API',
      type: 'object',
      properties: {
        id: {
          description: 'The ID of the contacts folder',
          type: 'string',
          'x-ms-summary': 'ID',
          'x-ms-visibility': 'important',
        },
        displayName: {
          description: 'The name of the contacts folder',
          type: 'string',
          'x-ms-summary': 'Display Name',
          'x-ms-visibility': 'important',
        },
        parentFolderId: {
          description: 'The ID of the parent folder',
          type: 'string',
          'x-ms-summary': 'Parent Folder ID',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    'EntityListResponse[ContactResponse]': {
      description: 'Entity list response',
      type: 'object',
      properties: {
        value: {
          description: 'List of values',
          type: 'array',
          items: {
            $ref: '#/definitions/ContactResponse',
          },
        },
      },
    },
    ContactResponse: {
      description: 'Contact response',
      type: 'object',
      properties: {
        GivenName: {
          description: "The contact's given name",
          type: 'string',
          'x-ms-summary': 'Given name',
        },
        HomePhones: {
          description: "The contact's home phone numbers",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Home phones',
        },
        Id: {
          description: "The contact's unique identifier.",
          type: 'string',
          'x-ms-summary': 'Id',
        },
        ParentFolderId: {
          description: "The ID of the contact's parent folder",
          type: 'string',
          'x-ms-summary': 'Parent folder id',
          'x-ms-visibility': 'advanced',
        },
        Birthday: {
          format: 'date-time',
          description: "The contact's birthday",
          type: 'string',
          'x-ms-summary': 'Birthday',
          'x-ms-visibility': 'advanced',
        },
        FileAs: {
          description: 'The name the contact is filed under',
          type: 'string',
          'x-ms-summary': 'File as',
          'x-ms-visibility': 'advanced',
        },
        DisplayName: {
          description: "The contact's display name",
          type: 'string',
          'x-ms-summary': 'Display Name',
        },
        Initials: {
          description: "The contact's initials",
          type: 'string',
          'x-ms-summary': 'Initials',
          'x-ms-visibility': 'advanced',
        },
        MiddleName: {
          description: "The contact's middle name",
          type: 'string',
          'x-ms-summary': 'Middle name',
          'x-ms-visibility': 'advanced',
        },
        NickName: {
          description: "The contact's nickname",
          type: 'string',
          'x-ms-summary': 'Nickname',
          'x-ms-visibility': 'advanced',
        },
        Surname: {
          description: "The contact's surname",
          type: 'string',
          'x-ms-summary': 'Surname',
          'x-ms-visibility': 'advanced',
        },
        Title: {
          description: "The contact's title",
          type: 'string',
          'x-ms-summary': 'Title',
          'x-ms-visibility': 'advanced',
        },
        Generation: {
          description: "The contact's generation",
          type: 'string',
          'x-ms-summary': 'Generation',
          'x-ms-visibility': 'advanced',
        },
        EmailAddresses: {
          description: "The contact's email addresses",
          type: 'array',
          items: {
            $ref: '#/definitions/EmailAddress',
          },
          'x-ms-summary': 'Email addresses',
        },
        ImAddresses: {
          description: "The contact's instant messaging (IM) addresses",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'IM addresses',
          'x-ms-visibility': 'advanced',
        },
        JobTitle: {
          description: "The contact's job title",
          type: 'string',
          'x-ms-summary': 'JobTitle',
          'x-ms-visibility': 'advanced',
        },
        CompanyName: {
          description: "The name of the contact's company",
          type: 'string',
          'x-ms-summary': 'Company name',
        },
        Department: {
          description: "The contact's department",
          type: 'string',
          'x-ms-summary': 'Department',
          'x-ms-visibility': 'advanced',
        },
        OfficeLocation: {
          description: "The location of the contact's office",
          type: 'string',
          'x-ms-summary': 'Office location',
          'x-ms-visibility': 'advanced',
        },
        Profession: {
          description: "The contact's profession",
          type: 'string',
          'x-ms-summary': 'Profession',
          'x-ms-visibility': 'advanced',
        },
        BusinessHomePage: {
          description: 'The business home page of the contact',
          type: 'string',
          'x-ms-summary': 'Business home page',
          'x-ms-visibility': 'advanced',
        },
        AssistantName: {
          description: "The name of the contact's assistant",
          type: 'string',
          'x-ms-summary': 'Assistant name',
          'x-ms-visibility': 'advanced',
        },
        Manager: {
          description: "The name of the contact's manager",
          type: 'string',
          'x-ms-summary': 'Manager',
          'x-ms-visibility': 'advanced',
        },
        BusinessPhones: {
          description: "The contact's business phone numbers",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Business phones',
        },
        MobilePhone1: {
          description: "The contact's mobile phone number",
          type: 'string',
          'x-ms-summary': 'Mobile phone',
        },
        HomeAddress: {
          $ref: '#/definitions/PhysicalAddress',
        },
        BusinessAddress: {
          $ref: '#/definitions/PhysicalAddress',
        },
        OtherAddress: {
          $ref: '#/definitions/PhysicalAddress',
        },
        YomiCompanyName: {
          description: 'The phonetic Japanese company name of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi company name',
          'x-ms-visibility': 'advanced',
        },
        YomiGivenName: {
          description: 'The phonetic Japanese given name (first name) of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi given name',
          'x-ms-visibility': 'advanced',
        },
        YomiSurname: {
          description: 'The phonetic Japanese surname (last name) of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi surname',
          'x-ms-visibility': 'advanced',
        },
        Categories: {
          description: 'The categories associated with the contact',
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Categories',
          'x-ms-visibility': 'advanced',
        },
        ChangeKey: {
          description: 'Identifies the version of the event object',
          type: 'string',
          'x-ms-summary': 'Change key',
          'x-ms-visibility': 'advanced',
        },
        DateTimeCreated: {
          format: 'date-time',
          description: 'The time the contact was created',
          type: 'string',
          'x-ms-summary': 'Created time',
          'x-ms-visibility': 'advanced',
        },
        DateTimeLastModified: {
          format: 'date-time',
          description: 'The time the contact was modified',
          type: 'string',
          'x-ms-summary': 'Last modified time',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    Contact: {
      description: 'Contact',
      required: ['GivenName', 'HomePhones'],
      type: 'object',
      properties: {
        Id: {
          description: "The contact's unique identifier.",
          type: 'string',
          'x-ms-summary': 'Id',
        },
        ParentFolderId: {
          description: "The ID of the contact's parent folder",
          type: 'string',
          'x-ms-summary': 'Parent folder id',
          'x-ms-visibility': 'advanced',
        },
        Birthday: {
          format: 'date-time',
          description: "The contact's birthday",
          type: 'string',
          'x-ms-summary': 'Birthday',
          'x-ms-visibility': 'advanced',
        },
        FileAs: {
          description: 'The name the contact is filed under',
          type: 'string',
          'x-ms-summary': 'File as',
          'x-ms-visibility': 'advanced',
        },
        DisplayName: {
          description: "The contact's display name",
          type: 'string',
          'x-ms-summary': 'Display Name',
        },
        GivenName: {
          description: "The contact's given name",
          type: 'string',
          'x-ms-summary': 'Given name',
        },
        Initials: {
          description: "The contact's initials",
          type: 'string',
          'x-ms-summary': 'Initials',
          'x-ms-visibility': 'advanced',
        },
        MiddleName: {
          description: "The contact's middle name",
          type: 'string',
          'x-ms-summary': 'Middle name',
          'x-ms-visibility': 'advanced',
        },
        NickName: {
          description: "The contact's nickname",
          type: 'string',
          'x-ms-summary': 'Nickname',
          'x-ms-visibility': 'advanced',
        },
        Surname: {
          description: "The contact's surname",
          type: 'string',
          'x-ms-summary': 'Surname',
          'x-ms-visibility': 'advanced',
        },
        Title: {
          description: "The contact's title",
          type: 'string',
          'x-ms-summary': 'Title',
          'x-ms-visibility': 'advanced',
        },
        Generation: {
          description: "The contact's generation",
          type: 'string',
          'x-ms-summary': 'Generation',
          'x-ms-visibility': 'advanced',
        },
        EmailAddresses: {
          description: "The contact's email addresses",
          type: 'array',
          items: {
            $ref: '#/definitions/EmailAddress',
          },
          'x-ms-summary': 'Email addresses',
        },
        ImAddresses: {
          description: "The contact's instant messaging (IM) addresses",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'IM addresses',
          'x-ms-visibility': 'advanced',
        },
        JobTitle: {
          description: "The contact's job title",
          type: 'string',
          'x-ms-summary': 'JobTitle',
          'x-ms-visibility': 'advanced',
        },
        CompanyName: {
          description: "The name of the contact's company",
          type: 'string',
          'x-ms-summary': 'Company name',
        },
        Department: {
          description: "The contact's department",
          type: 'string',
          'x-ms-summary': 'Department',
          'x-ms-visibility': 'advanced',
        },
        OfficeLocation: {
          description: "The location of the contact's office",
          type: 'string',
          'x-ms-summary': 'Office location',
          'x-ms-visibility': 'advanced',
        },
        Profession: {
          description: "The contact's profession",
          type: 'string',
          'x-ms-summary': 'Profession',
          'x-ms-visibility': 'advanced',
        },
        BusinessHomePage: {
          description: 'The business home page of the contact',
          type: 'string',
          'x-ms-summary': 'Business home page',
          'x-ms-visibility': 'advanced',
        },
        AssistantName: {
          description: "The name of the contact's assistant",
          type: 'string',
          'x-ms-summary': 'Assistant name',
          'x-ms-visibility': 'advanced',
        },
        Manager: {
          description: "The name of the contact's manager",
          type: 'string',
          'x-ms-summary': 'Manager',
          'x-ms-visibility': 'advanced',
        },
        HomePhones: {
          description: "The contact's home phone numbers",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Home phones',
        },
        BusinessPhones: {
          description: "The contact's business phone numbers",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Business phones',
        },
        MobilePhone1: {
          description: "The contact's mobile phone number",
          type: 'string',
          'x-ms-summary': 'Mobile phone',
        },
        HomeAddress: {
          $ref: '#/definitions/PhysicalAddress',
        },
        BusinessAddress: {
          $ref: '#/definitions/PhysicalAddress',
        },
        OtherAddress: {
          $ref: '#/definitions/PhysicalAddress',
        },
        YomiCompanyName: {
          description: 'The phonetic Japanese company name of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi company name',
          'x-ms-visibility': 'advanced',
        },
        YomiGivenName: {
          description: 'The phonetic Japanese given name (first name) of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi given name',
          'x-ms-visibility': 'advanced',
        },
        YomiSurname: {
          description: 'The phonetic Japanese surname (last name) of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi surname',
          'x-ms-visibility': 'advanced',
        },
        Categories: {
          description: 'The categories associated with the contact',
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Categories',
          'x-ms-visibility': 'advanced',
        },
        ChangeKey: {
          description: 'Identifies the version of the event object',
          type: 'string',
          'x-ms-summary': 'Change key',
          'x-ms-visibility': 'advanced',
        },
        DateTimeCreated: {
          format: 'date-time',
          description: 'The time the contact was created',
          type: 'string',
          'x-ms-summary': 'Created time',
          'x-ms-visibility': 'advanced',
        },
        DateTimeLastModified: {
          format: 'date-time',
          description: 'The time the contact was modified',
          type: 'string',
          'x-ms-summary': 'Last modified time',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    DataSetsList: {
      description: 'List of datasets',
      type: 'object',
      properties: {
        value: {
          description: 'List of datasets',
          type: 'array',
          items: {
            $ref: '#/definitions/DataSet',
          },
        },
      },
    },
    DataSet: {
      description: 'Dataset',
      type: 'object',
      properties: {
        Name: {
          description: 'Dataset name',
          type: 'string',
        },
        DisplayName: {
          description: 'Dataset display name',
          type: 'string',
        },
        query: {
          description: 'Pass-through Native Queries',
          type: 'array',
          items: {
            $ref: '#/definitions/PassThroughNativeQuery',
          },
          readOnly: true,
        },
      },
    },
    Procedure: {
      description: 'Procedure',
      type: 'object',
      properties: {
        Name: {
          description: 'Procedure name',
          type: 'string',
        },
        DisplayName: {
          description: 'Procedure display name',
          type: 'string',
        },
      },
    },
    PassThroughNativeQuery: {
      description: 'static schema for pass-through native query execution',
      type: 'object',
      properties: {
        Language: {
          description: 'Query language',
          type: 'string',
        },
      },
    },
    AutomaticRepliesSettingClient_V2: {
      description: 'Automatic replies setting model for the connector',
      required: ['status', 'externalAudience'],
      type: 'object',
      properties: {
        status: {
          description: 'Automatic reply setting status',
          default: 'Scheduled',
          enum: ['disabled', 'alwaysEnabled', 'scheduled'],
          'x-ms-enum-values': [
            {
              displayName: 'Disabled',
              value: 'disabled',
            },
            {
              displayName: 'Always Enabled',
              value: 'alwaysEnabled',
            },
            {
              displayName: 'Scheduled',
              value: 'scheduled',
            },
          ],
          type: 'string',
          'x-ms-summary': 'Status',
        },
        externalAudience: {
          description: 'The audience that will see the external reply message',
          default: 'None',
          enum: ['none', 'contactsOnly', 'all'],
          'x-ms-enum-values': [
            {
              displayName: 'None',
              value: 'none',
            },
            {
              displayName: 'Contacts Only',
              value: 'contactsOnly',
            },
            {
              displayName: 'All',
              value: 'all',
            },
          ],
          type: 'string',
          'x-ms-summary': 'External Audience',
        },
        scheduledStartDateTime: {
          description: "Scheduled start time (example: '2017-08-29T04:00:00.0000000')",
          'x-ms-summary': 'Start Time',
          type: 'object',
          properties: {
            dateTime: {
              type: 'string',
              description: "Scheduled start time (example: '2017-08-29T04:00:00.0000000')",
              'x-ms-summary': 'DateTime',
            },
            timeZone: {
              type: 'string',
              description: "TimeZone (example: 'Pacific Standard Time')",
              'x-ms-summary': 'TimeZone',
            },
          },
        },
        scheduledEndDateTime: {
          description: "Scheduled end time (example: '2017-08-29T05:00:00.0000000')",
          'x-ms-summary': 'End Time',
          type: 'object',
          properties: {
            dateTime: {
              type: 'string',
              description: "Scheduled end time (example: '2017-08-29T05:00:00.0000000')",
              'x-ms-summary': 'DateTime',
            },
            timeZone: {
              type: 'string',
              description: "TimeZone (example: 'Pacific Standard Time')",
              'x-ms-summary': 'TimeZone',
            },
          },
        },
        internalReplyMessage: {
          description: 'Message for people within your organization',
          type: 'string',
          'x-ms-summary': 'Internal Reply Message',
        },
        externalReplyMessage: {
          description: 'Message for people outside your organization',
          type: 'string',
          'x-ms-summary': 'External Reply Message',
        },
      },
    },
    MailTipsClientReceive_V2: {
      description: 'Mail tips client model returned to the caller',
      type: 'object',
      properties: {
        automaticReplies: {
          $ref: '#/definitions/MailTipsAutomaticReplies_V2',
        },
        deliveryRestricted: {
          description: 'Is delivery restricted',
          'x-ms-summary': 'Is delivery restricted',
          type: 'boolean',
        },
        externalMemberCount: {
          format: 'int32',
          'x-ms-summary': 'Is moderated',
          description: 'Number of external members',
          type: 'integer',
        },
        isModerated: {
          description: 'Is moderated',
          'x-ms-summary': 'Is moderated',
          type: 'boolean',
        },
        mailboxFull: {
          description: 'Is mailbox full',
          'x-ms-summary': 'Is mailbox full',
          type: 'boolean',
        },
        maxMessageSize: {
          format: 'int64',
          description: 'Maximum message size',
          'x-ms-summary': 'Maximum message size',
          type: 'integer',
        },
        totalMemberCount: {
          format: 'int64',
          description: 'Total member count',
          'x-ms-summary': 'Total member count',
          type: 'integer',
        },
      },
    },
    MailTipsAutomaticReplies_V2: {
      description: 'Automatic replies as part of mail tips',
      type: 'object',
      properties: {
        message: {
          description: 'Automatic replies message',
          'x-ms-summary': 'Automatic replies message',
          type: 'string',
        },
      },
    },
    UpdateEmailFlag: {
      description: 'Update email flag body',
      type: 'object',
      properties: {
        flag: {
          description: 'Flag status',
          type: 'object',
          properties: {
            flagStatus: {
              description: 'Flag status',
              'x-ms-summary': 'Flag Status',
              type: 'string',
              enum: ['flagged', 'notFlagged', 'complete'],
              default: 'flagged',
              'x-ms-enum-values': [
                {
                  displayName: 'Flagged',
                  value: 'flagged',
                },
                {
                  displayName: 'Not Flagged',
                  value: 'notFlagged',
                },
                {
                  displayName: 'Complete',
                  value: 'complete',
                },
              ],
            },
          },
        },
      },
    },
    ResponseToEventInvite: {
      description: 'Response to an event invite',
      type: 'object',
      properties: {
        Comment: {
          description: 'Comment',
          type: 'string',
          'x-ms-summary': 'Comment',
        },
        SendResponse: {
          description: 'Send response to organizer?',
          default: true,
          type: 'boolean',
          'x-ms-summary': 'Send response?',
        },
      },
    },
    DirectForwardMessage: {
      description: 'Directly forward message',
      type: 'object',
      required: ['ToRecipients'],
      properties: {
        Comment: {
          description: 'Comment',
          type: 'string',
          'x-ms-summary': 'Comment',
        },
        ToRecipients: {
          description: 'Semicolon separated list of recipients to forward the message to',
          type: 'string',
          'x-ms-summary': 'To',
        },
      },
    },
    MeetingTimeSuggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          Confidence: {
            type: 'number',
            format: 'float',
            description: 'Confidence',
            'x-ms-summary': 'Confidence',
          },
          OrganizerAvailability: {
            type: 'string',
            description: 'Organizer Availability',
            'x-ms-summary': 'Organizer Availability',
          },
          SuggestionReason: {
            type: 'string',
            description: 'Suggestion Reason',
            'x-ms-summary': 'Suggestion Reason',
          },
          MeetingTimeSlot: {
            type: 'object',
            properties: {
              Start: {
                $ref: '#/definitions/DateTimeTimeZone',
              },
              End: {
                $ref: '#/definitions/DateTimeTimeZone',
              },
            },
            description: 'Meeting Time Slot',
            'x-ms-summary': 'Meeting Time Slot',
          },
          AttendeeAvailability: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                Availability: {
                  type: 'string',
                  description: 'Availability',
                  'x-ms-summary': 'Availability',
                },
                Attendee: {
                  type: 'object',
                  properties: {
                    Type: {
                      type: 'string',
                      description: 'Type',
                      'x-ms-summary': 'Type',
                    },
                    EmailAddress: {
                      type: 'object',
                      properties: {
                        Address: {
                          type: 'string',
                          description: 'Address',
                          'x-ms-summary': 'Address',
                        },
                      },
                      description: 'Email Address',
                      'x-ms-summary': 'Email Address',
                    },
                  },
                  description: 'Attendee',
                  'x-ms-summary': 'Attendee',
                },
              },
            },
            description: 'Attendee Availability',
            'x-ms-summary': 'Attendee Availability',
          },
          Locations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                DisplayName: {
                  type: 'string',
                  description: 'Display Name',
                  'x-ms-summary': 'Display Name',
                },
                LocationEmailAddress: {
                  type: 'string',
                  description: 'Location Email Address',
                  'x-ms-summary': 'Location Email Address',
                },
                Address: {
                  type: 'object',
                  properties: {
                    Type: {
                      type: 'string',
                      description: 'Type',
                      'x-ms-summary': 'Type',
                    },
                    Street: {
                      type: 'string',
                      description: 'Street',
                      'x-ms-summary': 'Street',
                    },
                    City: {
                      type: 'string',
                      description: 'City',
                      'x-ms-summary': 'City',
                    },
                    State: {
                      type: 'string',
                      description: 'State',
                      'x-ms-summary': 'State',
                    },
                    CountryOrRegion: {
                      type: 'string',
                      description: 'Country Or Region',
                      'x-ms-summary': 'Country Or Region',
                    },
                    PostalCode: {
                      type: 'string',
                      description: 'Postal Code',
                      'x-ms-summary': 'Postal Code',
                    },
                  },
                  description: 'Address',
                  'x-ms-summary': 'Address',
                },
              },
            },
            description: 'Locations',
            'x-ms-summary': 'Locations',
          },
        },
      },
      description: 'Meeting Time Suggestions',
      'x-ms-summary': 'Meeting Time Suggestions',
    },
    MeetingTimeSuggestions_V2: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          confidence: {
            type: 'number',
            format: 'float',
            description: 'Confidence',
            'x-ms-summary': 'Confidence',
          },
          organizerAvailability: {
            type: 'string',
            description: 'Organizer Availability',
            'x-ms-summary': 'Organizer Availability',
          },
          suggestionReason: {
            type: 'string',
            description: 'Suggestion Reason',
            'x-ms-summary': 'Suggestion Reason',
          },
          meetingTimeSlot: {
            type: 'object',
            properties: {
              start: {
                $ref: '#/definitions/DateTimeTimeZone_V2',
              },
              end: {
                $ref: '#/definitions/DateTimeTimeZone_V2',
              },
            },
            description: 'Meeting Time Slot',
            'x-ms-summary': 'Meeting Time Slot',
          },
          attendeeAvailability: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                availability: {
                  type: 'string',
                  description: 'Availability',
                  'x-ms-summary': 'Availability',
                },
                attendee: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      description: 'Type',
                      'x-ms-summary': 'Type',
                    },
                    emailAddress: {
                      type: 'object',
                      properties: {
                        address: {
                          type: 'string',
                          description: 'Address',
                          'x-ms-summary': 'Address',
                        },
                      },
                      description: 'Email Address',
                      'x-ms-summary': 'Email Address',
                    },
                  },
                  description: 'Attendee',
                  'x-ms-summary': 'Attendee',
                },
              },
            },
            description: 'Attendee Availability',
            'x-ms-summary': 'Attendee Availability',
          },
          locations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                displayName: {
                  type: 'string',
                  description: 'Display Name',
                  'x-ms-summary': 'Display Name',
                },
                locationEmailAddress: {
                  type: 'string',
                  description: 'Location Email Address',
                  'x-ms-summary': 'Location Email Address',
                },
                address: {
                  type: 'object',
                  properties: {
                    street: {
                      type: 'string',
                      description: 'Street',
                      'x-ms-summary': 'Street',
                    },
                    city: {
                      type: 'string',
                      description: 'City',
                      'x-ms-summary': 'City',
                    },
                    state: {
                      type: 'string',
                      description: 'State',
                      'x-ms-summary': 'State',
                    },
                    countryOrRegion: {
                      type: 'string',
                      description: 'Country Or Region',
                      'x-ms-summary': 'Country Or Region',
                    },
                    postalCode: {
                      type: 'string',
                      description: 'Postal Code',
                      'x-ms-summary': 'Postal Code',
                    },
                  },
                  description: 'Address',
                  'x-ms-summary': 'Address',
                },
              },
            },
            description: 'Locations',
            'x-ms-summary': 'Locations',
          },
        },
      },
      description: 'Meeting Time Suggestions',
      'x-ms-summary': 'Meeting Time Suggestions',
    },
    LocationConstraint: {
      type: 'object',
      properties: {
        IsRequired: {
          type: 'boolean',
          description: 'Should a meeting location be returned for the meeting?',
          'x-ms-summary': 'Is Required?',
        },
        SuggestLocation: {
          type: 'boolean',
          description: 'Should the response provide one or more meeting location suggestions?',
          'x-ms-summary': 'Suggest Location?',
        },
        Locations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ResolveAvailability: {
                type: 'boolean',
                description:
                  "If set to true and the specified resource is busy, looks for another resource that is free. If false and resource is busy, returns the best resource regardless of if it's free",
                'x-ms-summary': 'Resolve Availability?',
              },
              DisplayName: {
                type: 'string',
                description: 'The name associated with the location',
                'x-ms-summary': 'Display Name',
              },
            },
          },
          description: 'Locations',
          'x-ms-summary': 'Locations',
        },
      },
      description: 'Location Constraint',
      'x-ms-summary': 'Location Constraint',
    },
    DateTimeTimeZone: {
      type: 'object',
      properties: {
        DateTime: {
          type: 'string',
          description: 'DateTime',
          'x-ms-summary': 'DateTime',
        },
        TimeZone: {
          type: 'string',
          description: 'TimeZone',
          'x-ms-summary': 'TimeZone',
        },
      },
      description: 'DateTimeTimeZone',
      'x-ms-summary': 'DateTimeTimeZone',
    },
    DateTimeTimeZone_V2: {
      type: 'object',
      properties: {
        dateTime: {
          type: 'string',
          description: "DateTime (example: '2017-08-29T04:00:00.0000000')",
          'x-ms-summary': 'DateTime',
        },
        timeZone: {
          type: 'string',
          description: "TimeZone (example: 'Pacific Standard Time')",
          'x-ms-summary': 'TimeZone',
        },
      },
      description: 'DateTimeTimeZone',
      'x-ms-summary': 'DateTimeTimeZone',
    },
    'EntityListResponse[ContactResponse]_V2': {
      description: 'Entity list response',
      type: 'object',
      properties: {
        value: {
          description: 'List of values',
          type: 'array',
          items: {
            $ref: '#/definitions/ContactResponse_V2',
          },
        },
      },
    },
    EmailAddress_V2: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        address: {
          type: 'string',
          format: 'email',
        },
      },
    },
    PhysicalAddress_V2: {
      type: 'object',
      properties: {
        street: {
          type: 'string',
          description: "The contact's street address.",
          'x-ms-summary': 'Street',
        },
        city: {
          type: 'string',
          description: "The contact's city.",
          'x-ms-summary': 'City',
        },
        state: {
          type: 'string',
          description: "The contact's state.",
          'x-ms-summary': 'State',
        },
        countryOrRegion: {
          type: 'string',
          description: "The contact's country of region.",
          'x-ms-summary': 'Country Or Region',
        },
        postalCode: {
          type: 'string',
          description: "The contact's postal code.",
          'x-ms-summary': 'Postal code',
        },
      },
    },
    Contact_V2: {
      description: 'Contact',
      required: ['givenName', 'homePhones'],
      type: 'object',
      properties: {
        id: {
          description: "The contact's unique identifier.",
          type: 'string',
          'x-ms-summary': 'Id',
        },
        parentFolderId: {
          description: "The ID of the contact's parent folder",
          type: 'string',
          'x-ms-summary': 'Parent folder id',
          'x-ms-visibility': 'advanced',
        },
        birthday: {
          format: 'date-time',
          description: "The contact's birthday",
          type: 'string',
          'x-ms-summary': 'Birthday',
          'x-ms-visibility': 'advanced',
        },
        fileAs: {
          description: 'The name the contact is filed under',
          type: 'string',
          'x-ms-summary': 'File as',
          'x-ms-visibility': 'advanced',
        },
        displayName: {
          description: "The contact's display name",
          type: 'string',
          'x-ms-summary': 'Display Name',
        },
        givenName: {
          description: "The contact's given name",
          type: 'string',
          'x-ms-summary': 'Given name',
        },
        initials: {
          description: "The contact's initials",
          type: 'string',
          'x-ms-summary': 'Initials',
          'x-ms-visibility': 'advanced',
        },
        middleName: {
          description: "The contact's middle name",
          type: 'string',
          'x-ms-summary': 'Middle name',
          'x-ms-visibility': 'advanced',
        },
        nickName: {
          description: "The contact's nickname",
          type: 'string',
          'x-ms-summary': 'Nickname',
          'x-ms-visibility': 'advanced',
        },
        surname: {
          description: "The contact's surname",
          type: 'string',
          'x-ms-summary': 'Surname',
          'x-ms-visibility': 'advanced',
        },
        title: {
          description: "The contact's title",
          type: 'string',
          'x-ms-summary': 'Title',
          'x-ms-visibility': 'advanced',
        },
        generation: {
          description: "The contact's generation",
          type: 'string',
          'x-ms-summary': 'Generation',
          'x-ms-visibility': 'advanced',
        },
        emailAddresses: {
          description: "The contact's email addresses",
          type: 'array',
          items: {
            $ref: '#/definitions/EmailAddress_V2',
          },
          'x-ms-summary': 'Email addresses',
        },
        imAddresses: {
          description: "The contact's instant messaging (IM) addresses",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'IM addresses',
          'x-ms-visibility': 'advanced',
        },
        jobTitle: {
          description: "The contact's job title",
          type: 'string',
          'x-ms-summary': 'JobTitle',
          'x-ms-visibility': 'advanced',
        },
        companyName: {
          description: "The name of the contact's company",
          type: 'string',
          'x-ms-summary': 'Company name',
        },
        department: {
          description: "The contact's department",
          type: 'string',
          'x-ms-summary': 'Department',
          'x-ms-visibility': 'advanced',
        },
        officeLocation: {
          description: "The location of the contact's office",
          type: 'string',
          'x-ms-summary': 'Office location',
          'x-ms-visibility': 'advanced',
        },
        profession: {
          description: "The contact's profession",
          type: 'string',
          'x-ms-summary': 'Profession',
          'x-ms-visibility': 'advanced',
        },
        businessHomePage: {
          description: 'The business home page of the contact',
          type: 'string',
          'x-ms-summary': 'Business home page',
          'x-ms-visibility': 'advanced',
        },
        assistantName: {
          description: "The name of the contact's assistant",
          type: 'string',
          'x-ms-summary': 'Assistant name',
          'x-ms-visibility': 'advanced',
        },
        manager: {
          description: "The name of the contact's manager",
          type: 'string',
          'x-ms-summary': 'Manager',
          'x-ms-visibility': 'advanced',
        },
        homePhones: {
          description: "The contact's home phone numbers",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Home phones',
        },
        businessPhones: {
          description: "The contact's business phone numbers",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Business phones',
        },
        mobilePhone: {
          description: "The contact's mobile phone number",
          type: 'string',
          'x-ms-summary': 'Mobile phone',
        },
        homeAddress: {
          $ref: '#/definitions/PhysicalAddress_V2',
        },
        businessAddress: {
          $ref: '#/definitions/PhysicalAddress_V2',
        },
        otherAddress: {
          $ref: '#/definitions/PhysicalAddress_V2',
        },
        yomiCompanyName: {
          description: 'The phonetic Japanese company name of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi company name',
          'x-ms-visibility': 'advanced',
        },
        yomiGivenName: {
          description: 'The phonetic Japanese given name (first name) of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi given name',
          'x-ms-visibility': 'advanced',
        },
        yomiSurname: {
          description: 'The phonetic Japanese surname (last name) of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi surname',
          'x-ms-visibility': 'advanced',
        },
        categories: {
          description: 'The categories associated with the contact',
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Categories',
          'x-ms-visibility': 'advanced',
        },
        changeKey: {
          description: 'Identifies the version of the event object',
          type: 'string',
          'x-ms-summary': 'Change key',
          'x-ms-visibility': 'advanced',
        },
        createdDateTime: {
          format: 'date-time',
          description: 'The time the contact was created',
          type: 'string',
          'x-ms-summary': 'Created time',
          'x-ms-visibility': 'advanced',
        },
        lastModifiedDateTime: {
          format: 'date-time',
          description: 'The time the contact was modified',
          type: 'string',
          'x-ms-summary': 'Last modified time',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    ContactResponse_V2: {
      description: 'Contact',
      type: 'object',
      properties: {
        id: {
          description: "The contact's unique identifier.",
          type: 'string',
          'x-ms-summary': 'Id',
        },
        parentFolderId: {
          description: "The ID of the contact's parent folder",
          type: 'string',
          'x-ms-summary': 'Parent folder id',
          'x-ms-visibility': 'advanced',
        },
        birthday: {
          format: 'date-time',
          description: "The contact's birthday",
          type: 'string',
          'x-ms-summary': 'Birthday',
          'x-ms-visibility': 'advanced',
        },
        fileAs: {
          description: 'The name the contact is filed under',
          type: 'string',
          'x-ms-summary': 'File as',
          'x-ms-visibility': 'advanced',
        },
        displayName: {
          description: "The contact's display name",
          type: 'string',
          'x-ms-summary': 'Display Name',
        },
        givenName: {
          description: "The contact's given name",
          type: 'string',
          'x-ms-summary': 'Given name',
        },
        initials: {
          description: "The contact's initials",
          type: 'string',
          'x-ms-summary': 'Initials',
          'x-ms-visibility': 'advanced',
        },
        middleName: {
          description: "The contact's middle name",
          type: 'string',
          'x-ms-summary': 'Middle name',
          'x-ms-visibility': 'advanced',
        },
        nickName: {
          description: "The contact's nickname",
          type: 'string',
          'x-ms-summary': 'Nickname',
          'x-ms-visibility': 'advanced',
        },
        surname: {
          description: "The contact's surname",
          type: 'string',
          'x-ms-summary': 'Surname',
          'x-ms-visibility': 'advanced',
        },
        title: {
          description: "The contact's title",
          type: 'string',
          'x-ms-summary': 'Title',
          'x-ms-visibility': 'advanced',
        },
        generation: {
          description: "The contact's generation",
          type: 'string',
          'x-ms-summary': 'Generation',
          'x-ms-visibility': 'advanced',
        },
        emailAddresses: {
          description: "The contact's email addresses",
          type: 'array',
          items: {
            $ref: '#/definitions/EmailAddress_V2',
          },
          'x-ms-summary': 'Email addresses',
        },
        imAddresses: {
          description: "The contact's instant messaging (IM) addresses",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'IM addresses',
          'x-ms-visibility': 'advanced',
        },
        jobTitle: {
          description: "The contact's job title",
          type: 'string',
          'x-ms-summary': 'JobTitle',
          'x-ms-visibility': 'advanced',
        },
        companyName: {
          description: "The name of the contact's company",
          type: 'string',
          'x-ms-summary': 'Company name',
        },
        department: {
          description: "The contact's department",
          type: 'string',
          'x-ms-summary': 'Department',
          'x-ms-visibility': 'advanced',
        },
        officeLocation: {
          description: "The location of the contact's office",
          type: 'string',
          'x-ms-summary': 'Office location',
          'x-ms-visibility': 'advanced',
        },
        profession: {
          description: "The contact's profession",
          type: 'string',
          'x-ms-summary': 'Profession',
          'x-ms-visibility': 'advanced',
        },
        businessHomePage: {
          description: 'The business home page of the contact',
          type: 'string',
          'x-ms-summary': 'Business home page',
          'x-ms-visibility': 'advanced',
        },
        assistantName: {
          description: "The name of the contact's assistant",
          type: 'string',
          'x-ms-summary': 'Assistant name',
          'x-ms-visibility': 'advanced',
        },
        manager: {
          description: "The name of the contact's manager",
          type: 'string',
          'x-ms-summary': 'Manager',
          'x-ms-visibility': 'advanced',
        },
        homePhones: {
          description: "The contact's home phone numbers",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Home phones',
        },
        businessPhones: {
          description: "The contact's business phone numbers",
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Business phones',
        },
        mobilePhone: {
          description: "The contact's mobile phone number",
          type: 'string',
          'x-ms-summary': 'Mobile phone',
        },
        homeAddress: {
          $ref: '#/definitions/PhysicalAddress_V2',
        },
        businessAddress: {
          $ref: '#/definitions/PhysicalAddress_V2',
        },
        otherAddress: {
          $ref: '#/definitions/PhysicalAddress_V2',
        },
        yomiCompanyName: {
          description: 'The phonetic Japanese company name of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi company name',
          'x-ms-visibility': 'advanced',
        },
        yomiGivenName: {
          description: 'The phonetic Japanese given name (first name) of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi given name',
          'x-ms-visibility': 'advanced',
        },
        yomiSurname: {
          description: 'The phonetic Japanese surname (last name) of the contact',
          type: 'string',
          'x-ms-summary': 'Yomi surname',
          'x-ms-visibility': 'advanced',
        },
        categories: {
          description: 'The categories associated with the contact',
          type: 'array',
          items: {
            type: 'string',
          },
          'x-ms-summary': 'Categories',
          'x-ms-visibility': 'advanced',
        },
        changeKey: {
          description: 'Identifies the version of the event object',
          type: 'string',
          'x-ms-summary': 'Change key',
          'x-ms-visibility': 'advanced',
        },
        createdDateTime: {
          format: 'date-time',
          description: 'The time the contact was created',
          type: 'string',
          'x-ms-summary': 'Created time',
          'x-ms-visibility': 'advanced',
        },
        lastModifiedDateTime: {
          format: 'date-time',
          description: 'The time the contact was modified',
          type: 'string',
          'x-ms-summary': 'Last modified time',
          'x-ms-visibility': 'advanced',
        },
      },
    },
    ObjectWithoutType: {},
  },
  'x-ms-capabilities': {
    'file-picker': {
      open: {
        operationId: 'OnFilePickerOpen',
      },
      browse: {
        operationId: 'OnFilePickerBrowse',
        parameters: {
          id: {
            'value-property': 'Id',
          },
        },
      },
      'value-collection': 'value',
      'value-title': 'DisplayName',
      'value-folder-property': 'IsFolder',
      'value-media-property': 'MediaType',
    },
    testConnection: {
      operationId: 'TestConnection',
      parameters: {},
    },
  },
  externalDocs: {
    url: 'https://docs.microsoft.com/connectors/office365',
  },
};
