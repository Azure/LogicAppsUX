import type { OperationManifest } from '../../../../utils/src';
import { SettingScope } from '../../../../utils/src';

const methodOptions = [{ value: 'GET', displayName: 'GET' }];

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
            agentParameterSchema: {
              type: 'object',
              'x-ms-editor': 'schema',
            },
          },
          required: ['description'],
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
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            options: methodOptions,
          },
        },
        temperature: {
          type: 'number',
          title: 'Sampling temperature',
          description:
            'A value used to control the apparent creativity of generated completions. See [Azure.AI.Inference.ChatCompletionsOptions.Temperature Property](https://go.microsoft.com/fwlink/?linkid=2282134).',
          default: 1.0,
          maximum: 2.0,
          minimum: 0.0,
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
        top_p: {
          type: 'number',
          title: 'Nucleus sampling (top_p)',
          description:
            'A value used to control the apparent creativity of generated completions and an alternative value to Temperature. See [ChatCompletionsOptions.NucleusSamplingFactor Property](https://go.microsoft.com/fwlink/?linkid=2267246).',
          minimum: 0.0,
        },
        max_tokens: {
          type: 'integer',
          title: 'Max tokens',
          description:
            'The maximum number of tokens to generate. See [ChatCompletionsOptions.MaxTokens Property](https://go.microsoft.com/fwlink/?linkid=2267172).',
          minimum: 0.0,
        },
        presence_penalty: {
          type: 'number',
          title: 'Presence penalty',
          description:
            'A value that influences the probability of generated tokens appearing based on their existing presence in generated text. See [ChatCompletionsOptions.PresencePenalty Property](https://go.microsoft.com/fwlink/?linkid=2267450).',
          maximum: 2.0,
          minimum: -2.0,
        },
        frequency_penalty: {
          type: 'number',
          title: 'Frequency penalty',
          description:
            'A value that influences the probability of generated tokens appearing based on their cumulative frequence. See [ChatCompletionsOptions.FrequencyPenalty Property](https://go.microsoft.com/fwlink/?linkid=2267245).',
          maximum: 2.0,
          minimum: -2.0,
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
      id: '/connectionProviders/agent',
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
