import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/utils-logic-apps';
import { SettingScope } from '@microsoft/utils-logic-apps';

export const inlineCSharpManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/inline_code.svg',
    brandColor: '#ba5d00',
    description: `Execute C Sharp Code`,
    summary: 'Execute C Sharp Code',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['code'],
      properties: {
        code: {
          title: 'Code',
          description: 'Executes simple C sharp code with the ability to reference dynamic content',
          required: true,
          'x-ms-editor': 'code',
          'x-ms-editor-options': {
            language: 'csharp',
            rawValue: true,
          },
          default: 'static void Main(){\n\tConsole.WriteLine("Hello, World!");\n}',
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
          description: 'The return value of the C Sharp code execution',
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
