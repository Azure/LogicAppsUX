import { getInputParametersFromManifest } from '../initialize';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

describe('bjsworkflow initialize', () => {
  describe('getInputParametersFromManifest', () => {
    test('works for an OpenAPI operation with input parameters and values', () => {
      const manifest: OperationManifest = {
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
      const stepDefinition = {
        runAfter: {},
        type: 'OpenApiConnection',
        inputs: {
          parameters: {
            'emailMessage/Body': 'test1',
            'emailMessage/Importance': 'Normal',
            'emailMessage/Subject': 'test2',
            'emailMessage/To': 'johndoe@example.com',
          },
          host: {
            apiId: '/providers/Microsoft.PowerApps/apis/shared_office365',
            operationId: 'SendEmailV2',
            connection: 'shared_office365',
          },
          authentication: {
            value: 'dummy',
            type: 'Raw',
          },
        },
      };

      const inputParameters = getInputParametersFromManifest('Send_an_email', manifest, undefined /* customSwagger */, stepDefinition);

      expect(inputParameters.inputs.parameterGroups.default.parameters.length).toBe(10);
      expect(inputParameters.inputs.parameterGroups.default.parameters[0].value[0].value).toBe('johndoe@example.com');
      expect(inputParameters.inputs.parameterGroups.default.parameters[1].value[0].value).toBe('test2');
      expect(inputParameters.inputs.parameterGroups.default.parameters[2].value[0].value).toBe('test1');
      expect(inputParameters.inputs.parameterGroups.default.parameters[9].value[0].value).toBe('Normal');
    });

    test('works for an OpenAPI operation with input parameters but no values', () => {
      const manifest: OperationManifest = {
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
      const stepDefinition = {
        runAfter: {},
        type: 'OpenApiConnection',
        inputs: {
          host: {
            apiId: '/providers/Microsoft.PowerApps/apis/shared_office365users',
            operationId: 'MyProfile_V2',
            connection: 'shared_office365users',
          },
          authentication: {
            value: 'dummy',
            type: 'Raw',
          },
        },
      };

      const inputParameters = getInputParametersFromManifest('Get_my_profile', manifest, undefined /* customSwagger */, stepDefinition);

      expect(inputParameters.inputs.parameterGroups.default.parameters.length).toBe(1);
      expect(inputParameters.inputs.parameterGroups.default.parameters[0].value[0].value).toBe('');
    });
  });
});
