import type { OperationManifest } from '@microsoft-logic-apps/utils';

export const createItem: OperationManifest = {
  properties: {
    inputs: {
      type: 'object',
      properties: {
        dataset: {
          type: 'string',
          title: 'Site Address',
          description: 'Example: https://contoso.sharepoint.com/sites/sitename',
          'x-ms-property-name-alias': 'dataset',
          'x-ms-dynamic-list': {
            operationId: 'GetDataSets',
            parameters: {},
            itemsPath: 'value',
            itemValuePath: 'Name',
            itemTitlePath: 'DisplayName',
          },
        },
        table: {
          type: 'string',
          title: 'List Name',
          description: 'SharePoint list name',
          'x-ms-property-name-alias': 'table',
          'x-ms-dynamic-list': {
            operationId: 'GetTables',
            parameters: {
              dataset: {
                parameterReference: 'dataset',
              },
            },
            itemsPath: 'value',
            itemValuePath: 'Name',
            itemTitlePath: 'DisplayName',
          },
        },
        item: {
          type: 'object',
          title: 'Item',
          description: 'Item to create',
          'x-ms-property-name-alias': 'item',
          'x-ms-dynamic-properties': {
            operationId: 'GetTable',
            itemValuePath: 'Schema/Items',
            parameters: {
              dataset: {
                parameterReference: 'dataset',
              },
              table: {
                parameterReference: 'table',
              },
            },
          },
        },
        bool: {
          type: 'boolean',
          title: 'Boolean Parameter',
          default: true,
          'x-ms-property-name-alias': 'bool',
        },
        nestedObject: {
          type: 'object',
          required: ['emailMessage'],
          properties: {
            emailMessage: {
              type: 'object',
              title: 'Email',
              description: 'Email',
              required: ['Body', 'To'],
              properties: {
                From: {
                  type: 'string',
                  title: 'To',
                  format: 'email',
                  description: 'Email address to send mail from (requires "Send as" or "Send on behalf of" permission for that mailbox)',
                  'x-ms-property-name-alias': 'emailMessage/From',
                  'x-ms-visibility': 'advanced',
                },
                To: {
                  type: 'string',
                  format: 'email',
                  title: 'To',
                  description: 'Specify email addresses separated by semicolons like someone@contoso.com',
                  'x-ms-property-name-alias': 'emailMessage/To',
                },
                Body: {
                  type: 'string',
                  title: 'Body',
                  description: 'Specify the body of the mail',
                  'x-ms-property-name-alias': 'emailMessage/Body',
                },
                Attachments: {
                  type: 'array',
                  description: 'Attachments',
                  title: 'Attachments',
                  items: {
                    type: 'object',
                    description: 'Attachment',
                    required: ['ContentBytes', 'Name'],
                    properties: {
                      Name: {
                        type: 'string',
                        title: 'Attachment name',
                        description: 'Attachment name',
                        'x-ms-property-name-alias': 'Name',
                      },
                      ContentBytes: {
                        type: 'string',
                        format: 'byte',
                        title: 'Attachment Content',
                        description: 'Attachment content',
                        'x-ms-property-name-alias': 'ContentBytes',
                      },
                    },
                  },
                  'x-ms-property-name-alias': 'emailMessage/Attachments',
                  'x-ms-visibility': 'advanced',
                },
                PrimitiveArray: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  'x-ms-property-name-alias': 'emailMessage/PrimitiveArray',
                  'x-ms-visibility': 'advanced',
                },
                Object: {
                  type: 'object',
                  title: 'Object',
                  required: ['P1'],
                  properties: {
                    P1: {
                      type: 'string',
                      'x-ms-property-name-alias': 'emailMessage/Object/P1',
                      'x-ms-visibility': 'advanced',
                    },
                    P2: {
                      type: 'string',
                      'x-ms-property-name-alias': 'emailMessage/Object/P2',
                      'x-ms-visibility': 'advanced',
                    },
                  },
                  'x-ms-property-name-alias': 'emailMessage/Object',
                },
              },
              'x-ms-property-name-alias': 'emailMessage',
            },
          },
        },
      },
      required: ['dataset', 'item', 'table', 'nestedObject'],
    },
    outputs: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          'x-ms-property-name-alias': 'body',
          'x-ms-dynamic-properties': {
            operationId: 'GetTable',
            itemValuePath: 'Schema/Items',
            parameters: {
              dataset: {
                parameterReference: 'dataset',
              },
              table: {
                parameterReference: 'table',
              },
            },
          },
        },
      },
    },
    connector: {
      id: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline',
      name: 'shared_sharepointonline',
      properties: {
        capabilities: ['tabular', 'gateway', 'cloud'],
        displayName: 'Sharepoint',
        runtimeUrls: ['https://tip1-shared.azure-apim.net/apim/sharepointonline'],
        iconUri: 'https://connectoricons-prod.azureedge.net/sharepointonline/icon_1.0.1002.1175.png',
        brandColor: '#036c70',
      },
      type: 'Microsoft.PowerApps/apis',
    },
    iconUri: 'https://connectoricons-prod.azureedge.net/sharepointonline/icon_1.0.1002.1175.png',
    brandColor: '#036c70',
  },
};

export const getEmails: OperationManifest = {
  properties: {
    inputs: {},
    outputs: {
      type: 'object',
      properties: {
        body: {
          type: 'array',
          items: {
            type: 'object',
            description: 'Receive Email Message',
            required: ['Body', 'Subject', 'To'],
            properties: {
              From: {
                type: 'string',
                format: 'email',
                description: 'The mailbox owner and sender of the message',
                'x-ms-property-name-alias': 'From',
                'x-ms-visibility': 'important',
                title: 'From',
              },
              To: {
                type: 'string',
                format: 'email',
                description: 'The recipients for the message',
                'x-ms-property-name-alias': 'To',
                'x-ms-visibility': 'important',
                title: 'To',
              },
              Cc: {
                type: 'string',
                format: 'email',
                description: 'The Cc recipients for the message',
                'x-ms-property-name-alias': 'Cc',
                'x-ms-visibility': 'advanced',
                title: 'CC',
              },
              Bcc: {
                type: 'string',
                format: 'email',
                description: 'The Bcc recipients for the message',
                'x-ms-property-name-alias': 'Bcc',
                'x-ms-visibility': 'advanced',
                title: 'BCC',
              },
              Subject: {
                type: 'string',
                description: 'The subject of the message',
                'x-ms-property-name-alias': 'Subject',
                'x-ms-visibility': 'important',
                title: 'Subject',
              },
              Body: {
                type: 'string',
                description: 'The body of the message',
                'x-ms-property-name-alias': 'Body',
                'x-ms-visibility': 'important',
                title: 'Body',
              },
              Importance: {
                type: 'string',
                description: 'The importance of the message',
                enum: ['Low', 'Normal', 'High'],
                'x-ms-property-name-alias': 'Importance',
                title: 'Importance',
              },
              HasAttachment: {
                type: 'boolean',
                description: 'Indicates whether the message has attachments',
                'x-ms-property-name-alias': 'HasAttachment',
                title: 'Has Attachment',
              },
              Id: {
                type: 'string',
                description: 'The unique identifier of the message',
                'x-ms-property-name-alias': 'Id',
                'x-ms-visibility': 'advanced',
                title: 'Message ID',
              },
              ConversationId: {
                type: 'string',
                description: 'The Id of the conversation the email belongs to',
                'x-ms-property-name-alias': 'ConversationId',
                'x-ms-visibility': 'advanced',
                title: 'Conversation ID',
              },
              DateTimeReceived: {
                type: 'string',
                format: 'date-time',
                description: 'The date and time the message was received',
                'x-ms-property-name-alias': 'DateTimeReceived',
                'x-ms-visibility': 'advanced',
                title: 'Received Time',
              },
              IsRead: {
                type: 'boolean',
                description: 'Indicates whether the message has been read',
                'x-ms-property-name-alias': 'IsRead',
                'x-ms-visibility': 'advanced',
                title: 'Is Read',
              },
              Attachments: {
                type: 'array',
                description: 'The file attachments for the message',
                items: {
                  type: 'object',
                  description: 'File Attachment',
                  title: 'Attachments',
                  required: [],
                  properties: {
                    id: {
                      type: 'string',
                      description: 'Attachment Id',
                      'x-ms-property-name-alias': 'Id',
                      title: 'Attachment ID',
                    },
                    name: {
                      type: 'string',
                      description: 'Attachment name',
                      'x-ms-property-name-alias': 'Name',
                      title: 'Name',
                    },
                    contentBytes: {
                      type: 'string',
                      format: 'byte',
                      description: 'Attachment content',
                      'x-ms-property-name-alias': 'ContentBytes',
                      title: 'Content',
                    },
                    contentType: {
                      type: 'string',
                      description: 'Attachment content type',
                      'x-ms-property-name-alias': 'ContentType',
                      title: 'Content-Type',
                    },
                  },
                },
                'x-ms-property-name-alias': 'Attachments',
                'x-ms-visibility': 'advanced',
              },
              isHtml: {
                type: 'boolean',
                description: 'Is Html?',
                'x-ms-property-name-alias': 'IsHtml',
                'x-ms-visibility': 'advanced',
                title: 'Is HTML',
              },
            },
          },
          'x-ms-property-name-alias': 'body',
        },
      },
    },
    connector: {
      id: '/providers/Microsoft.PowerApps/apis/shared_office365',
      name: 'shared_office365',
      properties: {
        brandColor: '#0072c6',
        capabilities: ['actions'],
        displayName: 'Office 365 Outlook',
        runtimeUrls: ['https://tip1-shared.azure-apim.net/apim/office365'],
        iconUri: 'https://connectoricons-prod.azureedge.net/office365/icon_1.0.1008.1183.png',
      },
      type: 'Microsoft.PowerApps/apis',
    },
    iconUri: 'https://connectoricons-prod.azureedge.net/office365/icon_1.0.1008.1183.png',
    brandColor: '#0072c6',
    description: 'This operation gets emails from a folder.',
    summary: 'Get emails',
    externalDocs: {
      url: 'https://docs.microsoft.com/connectors/office365/#send-an-email-(v2)',
    },
  },
};

export const onNewEmail: OperationManifest = {
  properties: {
    inputs: {},
    outputs: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Represents a wrapper object for batch trigger response',
          required: [],
          properties: {
            value: {
              type: 'array',
              description: 'A list of the response objects',
              items: {
                type: 'object',
                description: 'Receive Email Message',
                required: ['Body', 'Subject', 'To'],
                properties: {
                  From: {
                    type: 'string',
                    format: 'email',
                    description: 'The mailbox owner and sender of the message',
                    'x-ms-property-name-alias': 'From',
                    'x-ms-visibility': 'important',
                  },
                  To: {
                    type: 'string',
                    format: 'email',
                    description: 'The recipients for the message',
                    'x-ms-property-name-alias': 'To',
                    'x-ms-visibility': 'important',
                  },
                  Subject: {
                    type: 'string',
                    description: 'The subject of the message',
                    'x-ms-property-name-alias': 'Subject',
                    'x-ms-visibility': 'important',
                  },
                  Body: {
                    type: 'string',
                    description: 'The body of the message',
                    'x-ms-property-name-alias': 'Body',
                    'x-ms-visibility': 'important',
                  },
                  Importance: {
                    type: 'string',
                    description: 'The importance of the message',
                    enum: ['Low', 'Normal', 'High'],
                    'x-ms-visibility': 'internal',
                    'x-ms-property-name-alias': 'Importance',
                  },
                  interests: {
                    type: 'array',
                    title: 'Interests',
                    items: {
                      type: 'string',
                    },
                    description: 'Interests',
                    'x-ms-property-name-alias': 'body/value/interests',
                  },
                  Attachments: {
                    type: 'array',
                    description: 'The file attachments for the message',
                    items: {
                      type: 'object',
                      description: 'File Attachment',
                      required: [],
                      properties: {
                        Id: {
                          type: 'string',
                          description: 'Attachment Id',
                          'x-ms-property-name-alias': 'Id',
                        },
                        Name: {
                          type: 'string',
                          description: 'Attachment name',
                          'x-ms-property-name-alias': 'Name',
                        },
                        ContentBytes: {
                          type: 'string',
                          format: 'byte',
                          description: 'Attachment content',
                          'x-ms-property-name-alias': 'ContentBytes',
                        },
                        ContentType: {
                          type: 'string',
                          description: 'Attachment content type',
                          'x-ms-property-name-alias': 'ContentType',
                        },
                      },
                    },
                    'x-ms-property-name-alias': 'Attachments',
                    'x-ms-visibility': 'advanced',
                  },
                },
              },
              'x-ms-property-name-alias': 'body/value',
            },
          },
          'x-ms-property-name-alias': 'body',
        },
      },
    },
    connector: {
      id: '/providers/Microsoft.PowerApps/apis/shared_office365',
      name: 'shared_office365',
      properties: {
        brandColor: '#0072c6',
        capabilities: ['actions'],
        displayName: 'Office 365 Outlook',
        runtimeUrls: ['https://tip1-shared.azure-apim.net/apim/office365'],
        iconUri: 'https://connectoricons-prod.azureedge.net/office365/icon_1.0.1008.1183.png',
      },
      type: 'Microsoft.PowerApps/apis',
    },
    trigger: 'batch',
    triggerHint: 'To see it work now, send a new email in your inbox.',
    iconUri: 'https://connectoricons-prod.azureedge.net/office365/icon_1.0.1008.1183.png',
    brandColor: '#0072c6',
  },
};
