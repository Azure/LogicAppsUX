import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { SettingScope } from '@microsoft/logic-apps-shared';

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

export const inlinePowershellManifest = {
  properties: {
    iconUri: 'https://logicapps.azureedge.net/icons/javascript.svg',
    brandColor: '#ba5d00',
    summary: 'Execute Powershell Code',
    description: 'Execute Powershell Code',
    visibility: 'Important',
    operationType: 'PowershellCode',
    api: {
      id: 'connectionProviders/inlineCode',
      name: 'inlineCode',
      displayName: 'Inline Code',
      iconUri: 'https://logicapps.azureedge.net/icons/inline_code.svg',
      brandColor: '#ba5d00',
      description: 'Inline Code',
    },
    inputs: {
      type: 'object',
      properties: {
        CodeFile: {
          title: 'Code File',
          description: 'The powershell script to execute',
          'x-ms-editor': 'code',
          'x-ms-editor-options': {
            language: 'powershell',
            rawValue: true,
          },
        },
      },
      required: ['CodeFile'],
    },
    isInputsOptional: false,
    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          title: 'Result',
          description: 'The return value of the powershell code execution',
        },
      },
    },
    isOutputsOptional: false,
    settings: {
      secureData: {
        options: {
          outputsMode: 'LinkedToInputs',
        },
      },
      trackedProperties: {
        scopes: ['Action'],
      },
    },
    includeRootOutputs: true,
    connector: {
      name: 'inlineCode',
      id: 'connectionProviders/inlineCode',
      properties: {
        displayName: 'Inline Code',
        iconUri: 'https://logicapps.azureedge.net/icons/inline_code.svg',
        brandColor: '#ba5d00',
        description: 'Inline Code',
      },
    } as any,
  },
} as OperationManifest;
