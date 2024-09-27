export const inputs = {
  host: {
    api: {
      runtimeUrl: 'https://tip1-shared.azure-apim.net/apim/sharepointonline',
    },
    connection: {
      name: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline/connections/shared-sharepointonl-bb101455-45c5-473f-98ee-2015bcd222b3',
    },
  },
  method: 'get',
  path: '/datasets/https%253a%252f%252fmicrosoft.sharepoint.com%252fteams%252fappplatform/tables/fdb7d9be-340a-4b91-af82-7511a59a7bc5/onnewitems',
  authentication: {
    scheme: 'Key',
    type: 'Raw',
  },
};

export const operation = {
  tags: ['SharePointListTableDataTrigger'],
  summary: 'When a new item is created',
  description: 'When a new item is created in a SharePoint list',
  operationId: 'GetOnNewItems',
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
      description: 'SharePoint Site url (example: http://contoso.sharepoint.com/sites/mysite)',
      required: true,
      type: 'string',
      'x-ms-summary': 'Site url',
      'x-ms-url-encoding': 'double',
      'x-ms-dynamic-values': {
        operationId: 'GetDataSets',
        'value-collection': 'value',
        'value-path': 'Name',
        'value-title': 'DisplayName',
      },
    },
    {
      name: 'table',
      in: 'path',
      description: 'SharePoint list name',
      required: true,
      type: 'string',
      'x-ms-summary': 'List name',
      'x-ms-url-encoding': 'double',
      'x-ms-dynamic-values': {
        operationId: 'GetTables',
        parameters: {
          dataset: {
            parameter: 'dataset',
          },
        },
        'value-collection': 'value',
        'value-path': 'Name',
        'value-title': 'DisplayName',
      },
    },
  ],
  responses: {},
  deprecated: false,
  'x-ms-visibility': 'important',
  'x-ms-trigger': 'batch',
  'x-ms-path': '/{connectionId}/datasets/{dataset}/tables/{table}/onnewitems',
  'x-ms-method': 'get',
};

export const parameters = {
  dataset: {
    key: 'body.$.dataset',
    description: 'SharePoint Site url (example: http://contoso.sharepoint.com/sites/mysite)',
    dynamicValues: {
      extension: {
        operationId: 'GetDataSets',
        'value-collection': 'value',
        'value-path': 'Name',
        'value-title': 'DisplayName',
      },
    },
    encode: 'double',
    in: 'path',
    name: 'dataset',
    required: true,
    summary: 'Site url',
    type: 'string',
  },
  table: {
    key: 'body.$.table',
    description: 'SharePoint list name',
    dynamicValues: {
      extension: {
        operationId: 'GetTables',
        parameters: {
          dataset: {
            parameter: 'dataset',
          },
        },
        'value-collection': 'value',
        'value-path': 'Name',
        'value-title': 'DisplayName',
      },
    },
    encode: 'double',
    in: 'path',
    name: 'table',
    required: true,
    summary: 'List name',
    type: 'string',
  },
};
