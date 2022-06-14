import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { SettingScope } from '@microsoft-logic-apps/utils';

export default {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iLTQgLTQgNjAgNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHBhdGggZD0ibS00LTRoNjB2NjBoLTYweiIgZmlsbD0iIzQ4NEY1OCIvPg0KIDxwYXRoIGQ9Ik00MSAxOC41di03LjVoLTMwdjcuNWg1LjY0djEzLjgzbC0zLjI4NS0zLjI4NS0xLjA2NSAxLjA2NSA0LjAzNSA0LjA1Ljg3Ljg0aC02LjE5NXY2aDEzLjV2LTZoLTYuOWwuODU1LS44NTUgNC4wMzUtNC4wNS0xLjA2NS0xLjA2NS0zLjI4NSAzLjI4NXYtMTMuODE1aDE1djEzLjgzbC0zLjI4NS0zLjI4NS0xLjA2NSAxLjA2NSA0LjAzNSA0LjA1Ljg3Ljg0aC02LjE5NXY2aDEzLjV2LTZoLTYuOWwuODU1LS44NTUgNC4wMzUtNC4wNS0xLjA2NS0xLjA2NS0zLjI4NSAzLjI4NXYtMTMuODE1em0tMjguNS02aDI3djQuNWgtMjd6IiBmaWxsPSIjZmZmIi8+DQo8L3N2Zz4NCg==',
    brandColor: '#484F58',
    description: 'Identifies which block of actions to execute based on the evaluation of condition input.',

    allowChildOperations: true,

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
