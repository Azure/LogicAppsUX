import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { SettingScope } from '@microsoft/logic-apps-shared';

export const inlineCodeManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/inline_code.svg',
    brandColor: '#ba5d00',
    description: `Execute JavaScript Code`,
    summary: 'Execute JavaScript Code',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['code'],
      properties: {
        code: {
          title: 'Code',
          description: 'Executes simple JavaScript code with the ability to reference dynamic content',
          required: true,
          'x-ms-editor': 'code',
          'x-ms-editor-options': {
            language: 'javascript',
            rawValue: true,
          },
          default: 'var text = "Hello world from " + workflowContext.workflow.name;\r\n\r\nreturn text;',
        },
        explicitDependencies: {
          type: 'object',
          properties: {
            actions: {
              title: 'Actions',
              description: 'Actions data to be explicitly included',
              type: 'array',
              items: {
                type: 'string',
              },
            },
            includeTrigger: {
              title: 'Trigger',
              description: 'Provide trigger data to code execution',
              type: 'boolean',
            },
          },
        },
      },
    },
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          title: 'Result',
          description: 'The return value of the JavaScript code execution',
        },
      },
    },
    isOutputsOptional: false,

    connector: {
      id: 'connectionProviders/inlineCode',
      name: 'inlineCode',
      properties: {
        description: 'Inline Code',
        displayName: 'Inline Code',
      },
    } as any,

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
