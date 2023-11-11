import type { OperationManifest } from '@microsoft/logic-apps-designer';

export const mockGetMyOffice365ProfileOpenApiManifest: OperationManifest = {
  properties: {
    description:
      'Retrieves the profile of the current user. Learn more about available fields to select: https://developer.microsoft.com/en-us/graph/docs/api-reference/v1.0/resources/user#properties',
    summary: 'Get my profile (V2)',
    iconUri: 'https://connectoricons-df.azureedge.net/releases/v1.0.1626/1.0.1626.3238/office365users/icon.png',
    brandColor: '#eb3c00',
    inputs: {
      type: 'object',
      properties: {
        $select: {
          type: 'string',
          title: 'Select fields',
          description: 'Comma separated list of fields to select. Example: surname, department, jobTitle',
          'x-ms-visibility': 'advanced',
          'x-ms-property-name-alias': '$select',
        },
      },
      required: [],
    },
    inputsLocation: ['inputs', 'parameters'],
  },
};

export const mockPostTeamsAdaptiveCardOpenApiManifest: OperationManifest = {
  properties: {
    description: 'This operation posts an adaptive card to a chat or a channel and waits for a response.',
    summary: 'Post adaptive card and wait for a response',
    iconUri: 'https://connectoricons-df.azureedge.net/u/v-sriyen/PreviewApril18/1.0.1632.3271/teams/icon.png',
    brandColor: '#4B53BC',
    externalDocs: {
      url: 'https://docs.microsoft.com/connectors/teams/#post-adaptive-card-and-wait-for-a-response',
    },
    inputs: {
      type: 'object',
      properties: {
        poster: {
          type: 'string',
          title: 'Post as',
          description: 'Select an option',
          default: 'Flow bot',
          enum: ['Power Virtual Agents', 'Flow bot'],
          minLength: 1,
          'x-ms-enum-values': [
            {
              displayName: 'Power Virtual Agents (Preview)',
              value: 'Power Virtual Agents',
            },
            {
              displayName: 'Flow bot',
              value: 'Flow bot',
            },
          ],
          'x-ms-property-name-alias': 'poster',
        },
        location: {
          type: 'string',
          title: 'Post in',
          'x-ms-dynamic-list': {
            itemValuePath: 'id',
            dynamicState: {
              operationId: 'GetMessageLocations',
              parameters: {
                messageType: {
                  value: 'ParentMessage',
                },
                poster: {
                  parameterReference: 'poster',
                  required: true,
                },
              },
              itemsPath: 'value',
              itemValuePath: 'id',
              itemTitlePath: 'displayName',
            },
            parameters: {
              poster: {
                parameterReference: 'poster',
                required: true,
              },
            },
          },
          description: 'Select an option',
          minLength: 1,
          'x-ms-property-name-alias': 'location',
        },
        body: {
          type: 'object',
          properties: {
            body: {
              type: 'object',
              properties: {
                recipient: {
                  type: 'object',
                  'x-ms-dynamic-properties': {
                    dynamicState: {
                      extension: {
                        operationId: 'GetUnifiedActionSchema',
                        parameters: {
                          actionType: {
                            value: 'GatherInput',
                          },
                          poster: {
                            parameterReference: 'poster',
                            required: true,
                          },
                          recipientType: {
                            parameterReference: 'location',
                            required: true,
                          },
                        },
                        itemValuePath: 'schema',
                      },
                      isInput: true,
                      schemaAlias: 'body/body/recipient',
                    },
                    parameters: {
                      poster: {
                        parameterReference: 'poster',
                        required: true,
                      },
                      recipientType: {
                        parameterReference: 'location',
                        required: true,
                      },
                    },
                  },
                  'x-ms-property-name-alias': 'body/body/recipient',
                },
                messageBody: {
                  type: 'string',
                  title: 'Message',
                  'x-ms-property-name-alias': 'body/body/messageBody',
                },
                updateMessage: {
                  type: 'string',
                  title: 'Update message',
                  description: 'Message to show as an update in the original card following response',
                  default: 'Thanks for your response!',
                  'x-ms-property-name-alias': 'body/body/updateMessage',
                },
              },
              required: ['messageBody', 'recipient'],
              'x-ms-property-name-alias': 'body/body',
            },
          },
          required: ['body'],
          description: 'The flow continuation subscription request',
          'x-ms-property-name-alias': 'body',
        },
      },
      required: ['body', 'location', 'poster'],
    },
    inputsLocation: ['inputs', 'parameters'],
  },
};

export const mockSendAnOfficeOutlookEmailOpenApiManifest: OperationManifest = {
  properties: {
    description: 'This operation sends an email message.',
    inputs: {
      type: 'object',
      properties: {
        emailMessage: {
          type: 'object',
          properties: {
            To: {
              type: 'string',
              title: 'To',
              'x-ms-dynamic-list': {
                builtInOperation: 'AadGraph.GetUsers',
                itemValuePath: 'mail',
                dynamicState: {
                  builtInOperation: 'AadGraph.GetUsers',
                  parameters: {},
                  itemValuePath: 'mail',
                },
                parameters: {},
              },
              format: 'email',
              description: 'Specify email addresses separated by semicolons like someone@contoso.com',
              'x-ms-property-name-alias': 'emailMessage/To',
            },
            Subject: {
              type: 'string',
              title: 'Subject',
              description: 'Specify the subject of the mail',
              'x-ms-property-name-alias': 'emailMessage/Subject',
            },
            Body: {
              type: 'string',
              title: 'Body',
              format: 'html',
              description: 'Specify the body of the mail',
              'x-ms-property-name-alias': 'emailMessage/Body',
            },
            From: {
              type: 'string',
              title: 'From (Send as)',
              format: 'email',
              description:
                'Email address to send mail from (requires "Send as" or "Send on behalf of" permission for that mailbox). For more info on granting permissions please refer https://docs.microsoft.com/office365/admin/manage/send-email-as-distribution-list',
              'x-ms-visibility': 'advanced',
              'x-ms-property-name-alias': 'emailMessage/From',
            },
            Cc: {
              type: 'string',
              title: 'CC',
              'x-ms-dynamic-list': {
                builtInOperation: 'AadGraph.GetUsers',
                itemValuePath: 'mail',
                dynamicState: {
                  builtInOperation: 'AadGraph.GetUsers',
                  parameters: {},
                  itemValuePath: 'mail',
                },
                parameters: {},
              },
              format: 'email',
              description: 'Specify email addresses separated by semicolons like someone@contoso.com',
              'x-ms-visibility': 'advanced',
              'x-ms-property-name-alias': 'emailMessage/Cc',
            },
            Bcc: {
              type: 'string',
              title: 'BCC',
              'x-ms-dynamic-list': {
                builtInOperation: 'AadGraph.GetUsers',
                itemValuePath: 'mail',
                dynamicState: {
                  builtInOperation: 'AadGraph.GetUsers',
                  parameters: {},
                  itemValuePath: 'mail',
                },
                parameters: {},
              },
              format: 'email',
              description: 'Specify email addresses separated by semicolons like someone@contoso.com',
              'x-ms-visibility': 'advanced',
              'x-ms-property-name-alias': 'emailMessage/Bcc',
            },
            Attachments: {
              type: 'array',
              title: 'Attachments',
              items: {
                type: 'object',
                properties: {
                  Name: {
                    type: 'string',
                    title: 'Name',
                    description: 'Attachment name',
                    'x-ms-property-name-alias': 'Name',
                  },
                  ContentBytes: {
                    type: 'string',
                    title: 'Content',
                    format: 'byte',
                    description: 'Attachment content',
                    'x-ms-property-name-alias': 'ContentBytes',
                  },
                },
                required: ['ContentBytes', 'Name'],
                description: 'Attachment',
              },
              description: 'Attachments',
              'x-ms-visibility': 'advanced',
              'x-ms-property-name-alias': 'emailMessage/Attachments',
            },
            Sensitivity: {
              type: 'string',
              title: 'Sensitivity',
              'x-ms-dynamic-list': {
                itemValuePath: 'Id',
                dynamicState: {
                  operationId: 'GetSensitivityLabels',
                  parameters: {},
                  itemValuePath: 'Id',
                  itemTitlePath: 'DisplayName',
                },
                parameters: {},
              },
              description: 'Sensitivity',
              'x-ms-visibility': 'advanced',
              'x-ms-property-name-alias': 'emailMessage/Sensitivity',
            },
            ReplyTo: {
              type: 'string',
              title: 'Reply To',
              format: 'email',
              description: 'The email addresses to use when replying',
              'x-ms-visibility': 'advanced',
              'x-ms-property-name-alias': 'emailMessage/ReplyTo',
            },
            Importance: {
              type: 'string',
              title: 'Importance',
              description: 'Importance',
              default: 'Normal',
              enum: ['Low', 'Normal', 'High'],
              'x-ms-visibility': 'advanced',
              'x-ms-property-name-alias': 'emailMessage/Importance',
            },
          },
          required: ['Body', 'Subject', 'To'],
          description: 'Email.',
          'x-ms-property-name-alias': 'emailMessage',
        },
      },
      required: ['emailMessage'],
    },
    inputsLocation: ['inputs', 'parameters'],
    iconUri: 'https://connectoricons-df.azureedge.net/releases/v1.0.1626/1.0.1626.3238/office365/icon.png',
    brandColor: '#0078D4',
  },
};
