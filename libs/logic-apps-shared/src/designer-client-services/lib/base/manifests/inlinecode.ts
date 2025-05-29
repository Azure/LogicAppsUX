import { coreBadge } from '../../badges';
import type { OperationManifest } from '../../../../utils/src';
import { SettingScope } from '../../../../utils/src';

export const inlineCSharpManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/inline_code.svg',
    brandColor: '#ba5d00',
    description: 'Execute C Sharp Code',
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

export const inlinePythonManifest = {
  properties: {
    summary: 'Execute Python Code',
    description: 'Execute Code in a Python Session.',
    visibility: 'Important',
    operationType: 'ServiceProvider',
    brandColor: '#8c6cff',
    iconUri: 'https://logicapps.azureedge.net/icons/aioperations/icon.svg',
    api: {
      id: '/serviceProviders/acasession',
      type: 'ServiceProvider',
      name: 'acasession',
      displayName: 'Azure Container App (ACA) Session',
      iconUri: 'https://logicapps.azureedge.net/icons/aioperations/icon.svg',
      brandColor: '#8c6cff',
      description: 'Azure Container App (ACA) Session',
      isSecureByDefault: false,
    },
    inputs: {
      type: 'object',
      required: ['code'],
      properties: {
        code: {
          title: 'Code',
          description: 'Executes simple Python code with the ability to reference agent parameters',
          required: true,
          'x-ms-editor': 'code',
          'x-ms-connection-required': true,
          'x-ms-editor-options': {
            language: 'python',
            rawValue: true,
          },
          default: 'print("hello world")',
        },
        sessionId: {
          type: 'string',
          title: 'The Session ID',
          description: 'The ACA session Id',
        },
      },
    },
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'string',
          title: 'Result',
          description: 'The return value of the Python code execution',
        },
      },
    },
    isOutputsOptional: false,

    connector: {
      type: 'ServiceProvider',
      name: 'acasession',
      id: '/serviceProviders/acasession',
      properties: {
        displayName: 'Azure Container App (ACA) Session',
        iconUri: 'https://logicapps.azureedge.net/icons/aioperations/icon.svg',
        brandColor: '#8c6cff',
        description: 'Azure Container App (ACA) Session',
        capabilities: ['actions'],
        connectionParameterSets: {
          uiDefinition: {
            displayName: 'Connection Type',
            description: 'Connection Type',
          },
          values: [
            {
              name: 'ConnectionString',
              parameters: {
                poolManagementEndpoint: {
                  type: 'string',
                  parameterSource: 'AppConfiguration',
                  uiDefinition: {
                    displayName: 'Pool Management Endpoint',
                    tooltip: 'The Azure Container App (ACA) pool management endpoint',
                    constraints: {
                      required: 'true',
                    },
                    description: 'The Azure Container App (ACA) pool management endpoint.',
                  },
                },
              },
              uiDefinition: {
                displayName: 'Pool management connection',
                description: 'The Azure Container App (ACA) pool management connection.',
              },
            },
            {
              name: 'ManagedServiceIdentity',
              parameters: {
                poolManagementEndpoint: {
                  type: 'string',
                  parameterSource: 'AppConfiguration',
                  uiDefinition: {
                    displayName: 'Pool Management Endpoint',
                    tooltip: 'The Azure Container App (ACA) pool management endpoint',
                    constraints: {
                      required: 'true',
                    },
                    description: 'The Azure Container App (ACA) pool management endpoint.',
                  },
                },
                Type: {
                  type: 'string',
                  parameterSource: 'NotSpecified',
                  uiDefinition: {
                    displayName: 'Managed identity',
                    tooltip: 'Managed identity',
                    constraints: {
                      required: 'true',
                      default: 'ManagedServiceIdentity',
                      hideInUI: 'true',
                      propertyPath: ['authProvider'],
                    },
                    description: 'Managed identity',
                  },
                },
                Identity: {
                  type: 'string',
                  parameterSource: 'NotSpecified',
                  uiDefinition: {
                    displayName: 'Managed identity',
                    tooltip: 'Managed identity',
                    constraints: {
                      required: 'false',
                      hideInUI: 'true',
                      propertyPath: ['authProvider'],
                    },
                    description: 'Managed identity',
                  },
                },
              },
              uiDefinition: {
                displayName: 'Managed identity',
                tooltip: 'Managed identity',
                description: 'Managed identity',
              },
            },
          ],
        },
        isSecureByDefault: false,
      },
    },

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
