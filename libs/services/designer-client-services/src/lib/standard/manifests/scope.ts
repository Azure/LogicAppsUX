import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { SettingScope } from '@microsoft-logic-apps/utils';

export default {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzhDMzkwMCIvPg0KIDxwYXRoIGQ9Im04IDEwaDE2djEyaC0xNnptMTUgMTF2LTEwaC0xNHYxMHptLTItOHY2aC0xMHYtNnptLTEgNXYtNGgtOHY0eiIgZmlsbD0iI2ZmZiIvPg0KPC9zdmc+DQo=',
    brandColor: '#8C3900',
    description: 'Encapsulate a block of actions and inherit the last terminal status (Succeeded, Failed, Cancelled) of actions inside.',

    allowChildOperations: true,
    childOperationsLocation: ['actions'],

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
