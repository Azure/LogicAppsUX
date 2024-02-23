import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { SettingScope } from '@microsoft/logic-apps-shared';

export default {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzQ4Njk5MSIvPg0KIDxwYXRoIGQ9Ik0xMSAyMGg3LjJsMSAxaC05LjJ2LTguM2wtMS4zIDEuMy0uNy0uNyAyLjUtMi41IDIuNSAyLjUtLjcuNy0xLjMtMS4zem0xMi4zLTJsLjcuNy0yLjUgMi41LTIuNS0yLjUuNy0uNyAxLjMgMS4zdi03LjNoLTcuMmwtMS0xaDkuMnY4LjN6IiBmaWxsPSIjZmZmIi8+DQo8L3N2Zz4NCg==',
    brandColor: '#486991',
    description: 'Executes a block of actions for each item in the input array.',

    allowChildOperations: true,
    childOperationsLocation: ['actions'],

    inputs: {
      type: 'object',
      properties: {
        foreach: {
          title: 'Select an output from previous steps',
          description: 'Select an output from previous steps',
          type: 'array',
        },
      },
      required: ['foreach'],
    },
    inputsLocation: [],
    isInputsOptional: false,

    repetition: {
      loopParameter: 'foreach',
    },

    outputs: {
      type: 'any',
      title: 'Current item',
      required: true,
    },
    isOutputsOptional: false,

    connector: {
      id: 'connectionProviders/control',
      name: 'Control',
      properties: {
        description: 'Control operations',
        displayName: 'Control',
      },
    } as any,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
      concurrency: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
