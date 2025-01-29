export const testSwagger = {
  swagger: '2.0',
  host: 'logic-apis-northcentralus.azure-apim.net',
  basePath: '/apim/imanageworkforadmins',
  info: {
    title: 'iManage Work for Admins',
    description:
      'iManage Work for Admins connector enables administrators to automate their repetitive or integration tasks, such as adding users or updating custom fields.',
    version: '1.1',
    contact: {
      name: 'iManage LLC',
      url: 'https://docs.imanage.com',
      email: 'cloudsupport@imanage.com',
    },
    'x-ms-api-annotation': {
      status: 'Production',
    },
  },
  schemes: ['https'],
  consumes: ['application/json', 'multipart/form-data'],
  produces: ['application/json'],
  paths: {
    '/{connectionId}/getLibraries': {
      get: {
        summary: 'Get libraries',
        description: 'Gets a list of libraries to which the user has access.',
        tags: ['Library'],
        'x-im-controller': 'library.controllers',
        operationId: 'GetLibraries',
        'x-ms-visibility': 'internal',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            $ref: '#/parameters/connectorId_header',
          },
          {
            name: 'showAllLibraries',
            in: 'query',
            type: 'boolean',
            default: false,
            'x-ms-visibility': 'internal',
            required: false,
          },
          {
            name: 'hidePreferredLibrary',
            in: 'query',
            type: 'boolean',
            default: false,
            'x-ms-visibility': 'internal',
            required: false,
          },
        ],
        responses: {
          '200': {
            description: 'List of libraries.',
            schema: {
              type: 'object',
              properties: {},
              required: [],
              additionalProperties: false,
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/imanageworkforadmins/#get-libraries',
        },
      },
    },
    '/{connectionId}/getLookupFieldNames': {
      get: {
        summary: 'Get lookup field names',
        description: 'Gets a list of lookup field names.',
        tags: ['Library'],
        'x-im-controller': 'library.controllers',
        operationId: 'GetLookupFieldNames',
        'x-ms-visibility': 'internal',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            $ref: '#/parameters/connectorId_header',
          },
        ],
        responses: {
          '200': {
            description: 'List of custom fields.',
            schema: {
              type: 'object',
              properties: {},
              required: [],
              additionalProperties: false,
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/imanageworkforadmins/#get-lookup-field-names',
        },
      },
    },
    '/{connectionId}/getCreateCustomOrPropertyLookupSchema': {
      get: {
        summary: 'Get schema for create custom or property lookup',
        description: 'Gets the dynamic schema for CreateCustomOrPropertyLookup action.',
        tags: ['Library'],
        'x-im-controller': 'schema.controllers',
        operationId: 'GetCreateCustomOrPropertyLookupSchema',
        'x-ms-visibility': 'internal',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            $ref: '#/parameters/connectorId_header',
          },
          {
            name: 'lookupFieldId',
            in: 'query',
            type: 'string',
            'x-ms-summary': 'Lookup Field ID',
            description: 'Specifies the ID of the lookup field.',
            'x-ms-visibility': 'important',
            required: true,
          },
        ],
        responses: {
          '200': {
            description: 'The request succeeded.',
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                },
              },
              required: ['data'],
              additionalProperties: false,
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/imanageworkforadmins/#get-schema-for-create-custom-or-property-lookup',
        },
      },
    },
    '/{connectionId}/createCustomOrPropertyLookup': {
      post: {
        summary: 'Create alias for custom or property lookup',
        description: 'Creates a custom property alias for custom1 through custom12, custom29, and custom30.',
        tags: ['Library'],
        'x-im-controller': 'library.controllers',
        operationId: 'CreateCustomOrPropertyLookup',
        'x-ms-visibility': 'important',
        parameters: [
          {
            name: 'connectionId',
            in: 'path',
            required: true,
            type: 'string',
            'x-ms-visibility': 'internal',
          },
          {
            $ref: '#/parameters/connectorId_header',
          },
          {
            name: 'body',
            in: 'body',
            required: true,
            schema: {
              type: 'object',
              properties: {
                libraryId: {
                  type: 'string',
                  title: 'Library ID',
                  description: 'Specifies the ID of the target library.',
                  'x-ms-visibility': 'important',
                  'x-ms-dynamic-values': {
                    operationId: 'GetLibraries',
                    'value-collection': 'data',
                    'value-title': 'display_name',
                    'value-path': 'id',
                  },
                },
                lookupFieldId: {
                  type: 'string',
                  title: 'Lookup Field ID',
                  description: 'Specifies the lookup field ID.',
                  'x-ms-visibility': 'important',
                  'x-ms-dynamic-values': {
                    operationId: 'GetLookupFieldNames',
                    'value-collection': 'data',
                    'value-title': 'display_name',
                    'value-path': 'id',
                  },
                },
                aliasInfo: {
                  'x-ms-dynamic-schema': {
                    operationId: 'GetCreateCustomOrPropertyLookupSchema',
                    parameters: {
                      lookupFieldId: {
                        parameter: 'lookupFieldId',
                      },
                    },
                    'value-path': 'data',
                  },
                },
              },
              required: ['libraryId', 'lookupFieldId', 'aliasInfo'],
              additionalProperties: false,
            },
          },
        ],
        responses: {
          '200': {
            description: 'The request succeeded.',
            schema: {
              type: 'object',
              properties: {},
            },
          },
        },
        externalDocs: {
          url: 'https://docs.microsoft.com/connectors/imanageworkforadmins/#create-alias-for-custom-or-property-lookup',
        },
      },
    },
  },
  definitions: {},
  parameters: {
    connectorId_header: {
      name: 'x-im-connector-id',
      in: 'header',
      required: true,
      type: 'string',
      'x-ms-visibility': 'internal',
      default: 'imanage-work-for-admins',
    },
  },
  responses: {},
  securityDefinitions: {
    oauth2_auth: {
      type: 'oauth2',
      flow: 'accessCode',
      authorizationUrl: 'https://cloudimanage.com/automate/work/auth/login',
      tokenUrl: 'https://cloudimanage.com/automate/work/auth/token',
      scopes: {
        user: 'user',
      },
    },
  },
  security: [
    {
      oauth2_auth: ['user'],
    },
  ],
  tags: [],
  externalDocs: {
    url: 'https://docs.microsoft.com/connectors/imanageworkforadmins',
  },
};
