import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { SettingScope } from '@microsoft-logic-apps/utils';

export default {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzQ4NEY1OCIvPg0KIDxnIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBkPSJtMjUuNiAxOS42di03LjJoLTE5LjJ2Ny4yem0tMS4yLTEuMmgtMTYuODAxdi00LjhoMTYuOHY0Ljh6Ii8+DQogIDxwYXRoIGQ9Ik0xMS44IDE3LjJ2LTEuMmgtLjZ2LTEuMmgtMS4ydjEuMmgtLjZ2MS4yeiIvPg0KICA8cGF0aCBkPSJNMTUuNCAxNy4ydi0xLjJoLS42di0xLjJoLTEuMnYxLjJoLS42djEuMnoiLz4NCiAgPHBhdGggZD0iTTE5IDE3LjJ2LTEuMmgtLjZ2LTEuMmgtMS4ydjEuMmgtLjZ2MS4yeiIvPg0KICA8cGF0aCBkPSJNMjIuNiAxNy4ydi0xLjJoLS42di0xLjJoLTEuMnYxLjJoLS42djEuMnoiLz4NCiA8L2c+DQo8L3N2Zz4NCg==',
    brandColor: '#484F58',
    description: 'Identifies a single case to execute based on the evaluation of switch input.',

    allowChildOperations: true,
    childOperationsLocation: ['default', 'actions'],
    subGraphDetails: {
      cases: {
        isAdditive: true,
        location: ['actions'],
        inputs: {
          required: true,
          title: 'Equals',
        },
        inputsLocation: ['case'],
      },
    },

    inputs: {
      title: 'On',
      description: 'Choose a value',
      required: true,
    },
    inputsLocation: ['expression'],
    isInputsOptional: false,

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
    },
  },
} as OperationManifest;
