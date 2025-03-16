import type { OperationManifest } from '../../../../utils/src';
import { SettingScope } from '../../../../utils/src';

export default {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBpZD0idXVpZC1hOTNkNmI0YS02N2Y2LTQ1MjAtODNhOS0yMGIwZGJlMjQ1Y2YiIGRhdGEtbmFtZT0iTGF5ZXIgMSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB2aWV3Qm94PSIwIDAgMTggMTgiPg0KICA8ZGVmcz4NCiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InV1aWQtMGJmODYwMGYtNmQ3ZC00OTZmLWE1ZGMtZDJhZjg2ZGQ2NGNmIiBjeD0iLTY3Ljk4MSIgY3k9Ijc5My4xOTkiIGZ4PSItNjcuOTgxIiBmeT0iNzkzLjE5OSIgcj0iLjQ1IiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKC0xNzkzOS4wMyAyMDM2OC4wMjkpIHJvdGF0ZSg0NSkgc2NhbGUoMjUuMDkxIC0zNC4xNDkpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+DQogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM4M2I5ZjkiLz4NCiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwNzhkNCIvPg0KICAgIDwvcmFkaWFsR3JhZGllbnQ+DQogIDwvZGVmcz4NCiAgPHBhdGggZD0ibTAsMi43djEyLjZjMCwxLjQ5MSwxLjIwOSwyLjcsMi43LDIuN2gxMi42YzEuNDkxLDAsMi43LTEuMjA5LDIuNy0yLjdWMi43YzAtMS40OTEtMS4yMDktMi43LTIuNy0yLjdIMi43QzEuMjA5LDAsMCwxLjIwOSwwLDIuN1pNMTAuOCwwdjMuNmMwLDMuOTc2LDMuMjI0LDcuMiw3LjIsNy4yaC0zLjZjLTMuOTc2LDAtNy4xOTksMy4yMjItNy4yLDcuMTk4di0zLjU5OGMwLTMuOTc2LTMuMjI0LTcuMi03LjItNy4yaDMuNmMzLjk3NiwwLDcuMi0zLjIyNCw3LjItNy4yWiIgZmlsbD0idXJsKCN1dWlkLTBiZjg2MDBmLTZkN2QtNDk2Zi1hNWRjLWQyYWY4NmRkNjRjZikiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLXdpZHRoPSIwIi8+DQo8L3N2Zz4=',
    brandColor: '#072a8e',
    description:
      'Loop in which the AI agent decides at each step which tools to use and how, and which text to generate to respond to the user.',

    allowChildOperations: true,
    subGraphDetails: {
      tools: {
        isAdditive: true,
        location: ['actions'],
        inputs: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              title: 'Condition',
              description: 'The condition to execute this branch',
            },
            type: {
              'x-ms-visibility': 'internal',
              type: 'string',
              title: 'Type',
              default: 'Tool',
            },
            schema: {
              title: 'Agent Parameter Schema',
              description: 'The agent parameter schema',
              type: 'object',
              'x-ms-editor': 'schema',
            },
          },
          required: ['description'],
        },
        outputs: {
          type: 'object',
          required: ['schema'],
          properties: {
            schema: {
              title: 'Agent Schema',
              description: 'The agent parameter schema',
            },
          },
        },
        outputsSchema: {
          outputPaths: [
            {
              outputLocation: ['properties', 'schema'],
              name: 'schema',
              schema: 'Value',
            },
          ],
        },
        inputsLocation: [],
      },
    },
    inputs: {
      type: 'object',
      properties: {
        deploymentModel: {
          type: 'string',
          title: 'Deployment model',
          description: 'The deployment model connection',
          'x-ms-connection-required': true,
          'x-ms-visibility': 'important',
        },
        messages: {
          description: 'Messages',
          type: 'array',
          items: {
            description: 'Message',
            required: ['Role', 'Content'],
            type: 'object',
            properties: {
              role: {
                description: 'Message role',
                type: 'string',
                'x-ms-summary': 'Role',
              },
              content: {
                description: 'Message content',
                type: 'string',
                'x-ms-summary': 'Content',
              },
              image: {
                type: 'string',
                title: 'Chat Image message',
                description: 'The image content.',
              },
              author: {
                type: 'string',
                title: 'Chat Author',
                description: 'The chat author.',
              },
            },
          },
          required: ['Role', 'Content'],
          'x-ms-summary': 'Messages',
          'x-ms-visibility': 'important',
        },
      },
      required: ['deploymentModel', 'messages'],
    },
    inputsLocation: ['inputs', 'parameters'],
    isInputsOptional: false,

    connection: {
      required: true,
      type: 'agent',
    },

    connectionReference: {
      referenceKeyFormat: 'agentconnection',
    },

    connector: {
      id: 'connectionProviders/agent',
      name: 'Agent',
      properties: {
        description: 'Agent operations',
        displayName: 'Agent',
      },
    } as any,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
