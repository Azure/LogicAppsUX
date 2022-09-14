import { SettingScope } from '@microsoft-logic-apps/utils';
import type { OperationManifest } from '@microsoft-logic-apps/utils';

const brandColor = '#770BD6';
const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNzcwQkQ2Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Ik02Ljc2MywxMy42ODV2LTMuMjA4QzYuNzYzLDguNzQ4LDcuNzYyLDgsMTAsOHYxLjA3Yy0xLDAtMiwwLjMyNS0yLDEuNDA3djMuMTg4ICAgIEM4LDE0LjgzNiw2LjUxMiwxNiw1LjUxMiwxNkM2LjUxMiwxNiw4LDE3LjE2NCw4LDE4LjMzNVYyMS41YzAsMS4wODIsMSwxLjQyOSwyLDEuNDI5VjI0Yy0yLjIzOCwwLTMuMjM4LTAuNzcyLTMuMjM4LTIuNXYtMy4xNjUgICAgYzAtMS4xNDktMC44OTMtMS41MjktMS43NjMtMS41ODV2LTEuNUM1Ljg3LDE1LjE5NCw2Ljc2MywxNC44MzQsNi43NjMsMTMuNjg1eiIvPg0KICA8cGF0aCBkPSJtMjUuMjM4IDEzLjY4NXYtMy4yMDhjMC0xLjcyOS0xLTIuNDc3LTMuMjM4LTIuNDc3djEuMDdjMSAwIDIgMC4zMjUgMiAxLjQwN3YzLjE4OGMwIDEuMTcxIDEuNDg4IDIuMzM1IDIuNDg4IDIuMzM1LTEgMC0yLjQ4OCAxLjE2NC0yLjQ4OCAyLjMzNXYzLjE2NWMwIDEuMDgyLTEgMS40MjktMiAxLjQyOXYxLjA3MWMyLjIzOCAwIDMuMjM4LTAuNzcyIDMuMjM4LTIuNXYtMy4xNjVjMC0xLjE0OSAwLjg5My0xLjUyOSAxLjc2Mi0xLjU4NXYtMS41Yy0wLjg3LTAuMDU2LTEuNzYyLTAuNDE2LTEuNzYyLTEuNTY1eiIvPg0KICA8cGF0aCBkPSJtMTUuODE1IDE2LjUxMmwtMC4yNDItMC42NDFjLTAuMTc3LTAuNDUzLTAuMjczLTAuNjk4LTAuMjg5LTAuNzM0bC0wLjM3NS0wLjgzNmMtMC4yNjYtMC41OTktMC41MjEtMC44OTgtMC43NjYtMC44OTgtMC4zNyAwLTAuNjYyIDAuMzQ3LTAuODc1IDEuMDM5LTAuMTU2LTAuMDU3LTAuMjM0LTAuMTQxLTAuMjM0LTAuMjUgMC0wLjMyMyAwLjE4OC0wLjY5MiAwLjU2Mi0xLjEwOSAwLjM3NS0wLjQxNyAwLjcxLTAuNjI1IDEuMDA3LTAuNjI1IDAuNTgzIDAgMS4xODYgMC44MzkgMS44MTEgMi41MTZsMC4xNjEgMC40MTQgMC4xOC0wLjI4OWMxLjEwOC0xLjc2IDIuMDQ0LTIuNjQxIDIuODA0LTIuNjQxIDAuMTk4IDAgMC40MyAwLjA1OCAwLjY5NSAwLjE3MmwtMC45NDYgMC45OTJjLTAuMTI1LTAuMDM2LTAuMjE0LTAuMDU1LTAuMjY2LTAuMDU1LTAuNTczIDAtMS4yNTYgMC42NTktMi4wNDggMS45NzdsLTAuMjI3IDAuMzc5IDAuMTc5IDAuNDhjMC42ODQgMS44OTEgMS4yNDkgMi44MzYgMS42OTQgMi44MzYgMC40MDggMCAwLjcyLTAuMjkyIDAuOTM1LTAuODc1IDAuMTQ2IDAuMDk0IDAuMjE5IDAuMTkgMC4yMTkgMC4yODkgMCAwLjI2MS0wLjIwOCAwLjU3My0wLjYyNSAwLjkzOHMtMC43NzYgMC41NDctMS4wNzggMC41NDdjLTAuNjA0IDAtMS4yMjEtMC44NTItMS44NTEtMi41NTVsLTAuMjE5LTAuNTc4LTAuMjI3IDAuMzk4Yy0xLjA2MiAxLjgyMy0yLjA3OCAyLjczNC0zLjA0NyAyLjczNC0wLjM2NSAwLTAuNjc1LTAuMDkxLTAuOTMtMC4yNzFsMC45MDYtMC44ODVjMC4xNTYgMC4xNTYgMC4zMzggMC4yMzQgMC41NDcgMC4yMzQgMC41ODggMCAxLjI1LTAuNTk2IDEuOTg0LTEuNzg2bDAuNDA2LTAuNjU4IDAuMTU1LTAuMjU5eiIvPg0KICA8ZWxsaXBzZSB0cmFuc2Zvcm09Im1hdHJpeCguMDUzNiAtLjk5ODYgLjk5ODYgLjA1MzYgNS40OTI1IDMyLjI0NSkiIGN4PSIxOS43NTciIGN5PSIxMy4yMjUiIHJ4PSIuNzc4IiByeT0iLjc3OCIvPg0KICA8ZWxsaXBzZSB0cmFuc2Zvcm09Im1hdHJpeCguMDUzNiAtLjk5ODYgLjk5ODYgLjA1MzYgLTcuNTgzOSAzMC42MjkpIiBjeD0iMTIuMzY2IiBjeT0iMTkuMzE1IiByeD0iLjc3OCIgcnk9Ii43NzgiLz4NCiA8L2c+DQo8L3N2Zz4NCg==';

const connector = {
  id: 'connectionProviders/variable',
  name: 'variable',
  properties: {
    description: 'All variable operations',
    displayName: 'Variables',
  },
} as any;

export const initializeManifest = {
  properties: {
    iconUri,
    brandColor,
    description: 'Initializes a variable.',
    summary: 'Initialize variable',

    inputs: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          description: 'Enter variable name',
          'x-ms-editor': 'string',
        },
        type: {
          type: 'string',
          title: 'Type',
          'x-ms-editor': 'dropdown',
          'x-ms-editor-options': {
            options: [
              { value: 'boolean', displayName: 'Boolean' },
              { value: 'integer', displayName: 'Integer' },
              { value: 'float', displayName: 'Float' },
              { value: 'string', displayName: 'String' },
              { value: 'object', displayName: 'Object' },
              { value: 'array', displayName: 'Array' },
            ],
          },
          default: 'boolean',
        },
        value: {
          title: 'Value',
          description: 'Enter initial value',
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: {
                builtInOperation: 'getVariableSchema',
              },
              isInput: true,
            },
            parameters: {
              type: { parameterReference: 'type', required: true },
            },
          },
          'x-ms-visibility': 'important',
        },
      },
      required: ['name', 'type'],
    },
    inputsLocation: ['inputs', 'variables', '[*]'], // TODO - Need to add support to serialize this as array object
    isInputsOptional: false,

    connector,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const setManifest = {
  properties: {
    iconUri,
    brandColor,
    description: 'Set the variable value.',
    summary: 'Set variable',

    inputs: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          description: 'Enter variable name',
          'x-ms-editor': 'variablename',
        },
        value: {
          title: 'Value',
          description: 'Enter variable value',
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: {
                builtInOperation: 'getVariable',
              },
            },
            parameters: {
              name: { parameterReference: 'name', required: true },
            },
          },
        },
      },
      required: ['name', 'value'],
    },
    inputsLocation: ['inputs'],
    isInputsOptional: false,

    connector,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const incrementManifest = {
  properties: {
    iconUri,
    brandColor,
    description: 'Increments a variable.',
    summary: 'Increment variable',

    inputs: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          description: 'Enter variable name',
          'x-ms-editor': 'variablename',
          'x-ms-editor-options': {
            supportedTypes: ['float', 'integer'],
          },
        },
        value: {
          type: 'number',
          title: 'Value',
          description: 'Enter a value',
          'x-ms-visibility': 'important',
        },
      },
      required: ['name'],
    },
    inputsLocation: ['inputs'],
    isInputsOptional: false,

    connector,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const decrementManifest = {
  properties: {
    ...incrementManifest.properties,
    description: 'Decrements a variable.',
    summary: 'Decrement variable',
  },
} as OperationManifest;

export const appendArrayManifest = {
  properties: {
    ...incrementManifest.properties,
    description: 'Appends value to array variable.',
    summary: 'Append to array variable',
    inputs: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          description: 'Enter variable name',
          'x-ms-editor': 'variablename',
          'x-ms-editor-options': {
            supportedTypes: ['array'],
          },
        },
        value: {
          title: 'Value',
          description: 'Enter a value',
        },
      },
      required: ['name', 'value'],
    },
  },
} as OperationManifest;

export const appendStringManifest = {
  properties: {
    ...incrementManifest.properties,
    description: 'Appends value to string variable.',
    summary: 'Append to string variable',
    inputs: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          description: 'Enter variable name',
          'x-ms-editor': 'variablename',
          'x-ms-editor-options': {
            supportedTypes: ['string'],
          },
        },
        value: {
          title: 'Value',
          description: 'Enter a value',
        },
      },
      required: ['name', 'value'],
    },
  },
} as OperationManifest;
