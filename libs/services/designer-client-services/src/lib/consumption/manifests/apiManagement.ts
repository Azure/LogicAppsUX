import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iLTI4MCAzNzIgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHBhdGggZD0ibS0yODAgMzcyaDMydjMyaC0zMnoiIGZpbGw9IiM2ODIxN2EiLz4NCiA8ZyB0cmFuc2Zvcm09Im1hdHJpeCguMzgzNjkgMCAwIC4zODM2OSAtMTY2LjIgMjQyLjY0KSIgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Im0tMjU5LjUgMzg2LjVoLTguOWMtNC40IDAtOC0zLjYtOC04LjFzMy40LTguMSA4LTguMWMwLjggMCAxLjcgMC4yIDIuNyAwLjNsMS43IDAuNSAwLjUtMS43YzEuNi01LjIgNi42LTguNCAxMi4zLTguNCA2LjkgMCAxMi4yIDUuMyAxMi4yIDEyLjIgMCAxLjEtMC4yIDIuMi0wLjUgMy4zbC0wLjcgMi41IDIuNy0wLjNoMC41YzIgMCAzLjYgMS43IDMuNiAzLjZzLTEuNCAzLjMtMy4xIDMuNmgtOC45Yy0wLjMtMi41LTEuNi00LjctMy4zLTYuNC0yLjItMi4yLTUuMi0zLjUtOC4zLTMuNS0yLjIgMC00LjQgMC42LTYuMSAxLjdsMS45IDNjMS40LTAuOCAyLjgtMS4xIDQuNC0xLjEgMi4yIDAgNC40IDAuOCA1LjggMi41IDEuNiAxLjYgMi41IDMuNiAyLjUgNS44cy0wLjggNC40LTIuNSA1LjhjLTEuNiAxLjctMy42IDIuNS01LjggMi41LTEuNiAwLTMuMS0wLjUtNC40LTEuNGwtMS45IDNjMS45IDEuMSA0LjEgMS45IDYuMSAxLjkgMy4xIDAgNi4xLTEuMSA4LjMtMy40IDEuOS0xLjkgMy00LjQgMy4zLTdoOS4xIDAuMmMzLjYtMC4zIDYuMy0zLjQgNi4zLTcuMiAwLTMtMi44LTUuOC02LjEtNi40IDAuMi0wLjYgMC4yLTAuOSAwLjItMS45IDAtOC44LTYuMi0xNS44LTE2LjEtMTUuOC02LjMgMC0xMS45IDMuNi0xNC4yIDkuNC0wLjggMC0xLjQtMC4zLTIuMy0wLjMtNi41LTAuMS0xMS43IDQuOS0xMS43IDExLjMgMCA2LjMgNS4yIDExLjMgMTEuNCAxMS4zaDkuOHoiLz4NCiAgPGNpcmNsZSBjeD0iLTI1Ny4yIiBjeT0iMzg3LjgiIHI9IjUuNiIvPg0KIDwvZz4NCjwvc3ZnPg0K';

const brandColor = '#68217A';

const connector = {
  id: 'connectionProviders/apiManagementOperation',
  name: 'connectionProviders/apiManagementOperation',
  properties: {
    displayName: 'Azure API Management',
    description: 'Azure API Management',
  },
};

export const apiManagementActionManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Choose an Azure API Management action',
    description: `Show API Management APIs in my subscription`,

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: [],
      properties: {
        authentication: {
          type: 'object',
          title: 'Authentication',
          description: 'Enter JSON object of authentication parameter',
          'x-ms-visibility': 'advanced',
          'x-ms-editor': 'authentication',
          'x-ms-editor-options': {
            supportedAuthTypes: ['None', 'Basic', 'ClientCertificate', 'ActiveDirectoryOAuth', 'Raw', 'ManagedServiceIdentity'],
          },
        },
        subscriptionKey: {
          type: 'string',
          title: 'Subscription key',
          description: 'Enter subscription key',
        },
        api: {
          type: 'object',
          title: 'API',
          'x-ms-visibility': 'hideInUI',
          properties: {
            id: {
              type: 'string',
              'x-ms-visibility': 'hideInUI',
            },
          },
        },
        method: {
          type: 'string',
          'x-ms-visibility': 'hideInUI',
        },
        pathTemplate: {
          type: 'object',
          'x-ms-visibility': 'hideInUI',
          properties: {
            template: {
              type: 'string',
              'x-ms-visibility': 'hideInUI',
            },
            parameters: {
              type: 'object',
              'x-ms-visibility': 'hideInUI',
            },
          },
        },
      },
    },
    isInputsOptional: false,

    outputs: {},
    isOutputsOptional: false,
    includeRootOutputs: true,

    connector,

    settings: {},
  },
} as OperationManifest;

export const apiManagementTriggerManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Choose an Azure API Management trigger',
    description: `Show API Management APIs in my subscription`,

    environmentBadge: coreBadge,

    inputs: {},
    isInputsOptional: false,

    outputs: {},
    isOutputsOptional: false,
    includeRootOutputs: true,

    connector,

    settings: {},
  },
} as OperationManifest;
