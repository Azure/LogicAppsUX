import type { OperationManifest } from '../../../../utils/src';
import { OutputSecureDataMode, SettingScope } from '../../../../utils/src';

export const chunkTextManifest =  {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cGF0aCBmaWxsPSIjOEM2Q0ZGIiBkPSJtMCAwaDMydjMyaC0zMnoiLz4NCiA8ZyBmaWxsPSIjZmZmIj4NCiAgPHBhdGggZD0iTTEzLjE4NyAxNC4wNzloNi4xODd2LjY2NGwtMi4zMjEgMi4zMzd2Mi40MDFoLTEuNTQ1di0yLjQwMWwtMi4zMjEtMi4zMjF6bTUuODAzLjQ5NnYtLjExMmgtNS4zODd2LjExMmwyLjMyMSAyLjMyMXYyLjIwOWguOHYtMi4yMDl6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIuMjUiLz4NCiAgPHBhdGggdHJhbnNmb3JtPSJtYXRyaXgoLjggMCAwIC44IDMuMTk4IDIuNjczKSIgZD0iTTYgMTYuMDdhMi4yNCAyLjI0IDAgMCAwIC45LS4xOSAyLjM2IDIuMzYgMCAwIDAgMS4yNC0xLjI0IDIuMjIgMi4yMiAwIDAgMCAuMTktLjl2LTEuMjlhOC4yMiA4LjIyIDAgMCAxIDAtMS4yNiA0LjY4IDQuNjggMCAwIDEgLjMtMS4xOSAzLjA5IDMuMDkgMCAwIDEgLjcxLTEgMy40MiAzLjQyIDAgMCAxIDEuMTQtLjc1IDMuNTEgMy41MSAwIDAgMSAxLjM0LS4yNnYxLjExYTIuMjEgMi4yMSAwIDAgMC0uOS4xOSAyLjM2IDIuMzYgMCAwIDAtMS4yNCAxLjI0IDIuMjMgMi4yMyAwIDAgMC0uMTkuOXYyYTcgNyAwIDAgMS0uMDkuOTMgMy43MyAzLjczIDAgMCAxLS4yNS44NiAzLjI3IDMuMjcgMCAwIDEtLjQ3Ljc4IDMuNDQgMy40NCAwIDAgMS0uNzcuNjkgMy40OCAzLjQ4IDAgMCAxIC43Ny42OSAzLjI5IDMuMjkgMCAwIDEgLjQ3Ljc4IDMuNzUgMy43NSAwIDAgMSAuMjUuODYgNyA3IDAgMCAxIC4wOS45M3YyYTIuMjIgMi4yMiAwIDAgMCAuMTkuOSAyLjM3IDIuMzcgMCAwIDAgMS4yMyAxLjE1IDIuMjIgMi4yMiAwIDAgMCAuOS4xOXYxLjE2YTMuNDkgMy40OSAwIDAgMS0xLjM0LS4yNiAzLjQxIDMuNDEgMCAwIDEtMS4xNC0uNzUgMy4wOSAzLjA5IDAgMCAxLS43MS0xLjA2IDQuNjcgNC42NyAwIDAgMS0uMjktMS4xOCA4LjI0IDguMjQgMCAwIDEgMC0xLjI2di0xLjI5YTIuMjMgMi4yMyAwIDAgMC0uMTktLjkgMi4zNSAyLjM1IDAgMCAwLTEuMjQtMS4yMyAyLjIyIDIuMjIgMCAwIDAtLjktLjE4em0xNC4xOS04LjEzYTMuNTEgMy41MSAwIDAgMSAxLjM0LjI2IDMuNDIgMy40MiAwIDAgMSAxLjEzLjggMy4wOSAzLjA5IDAgMCAxIC43MSAxIDQuNjggNC42OCAwIDAgMSAuMjkgMS4xOSA4LjIyIDguMjIgMCAwIDEgMCAxLjI2djEuMjlhMi4yMiAyLjIyIDAgMCAwIC4xOS45IDIuMzcgMi4zNyAwIDAgMCAxLjI0IDEuMjQgMi4yMiAyLjIyIDAgMCAwIC45LjE5djEuMTZhMi4yMSAyLjIxIDAgMCAwLS45LjE5IDIuMzYgMi4zNiAwIDAgMC0xLjI0IDEuMjQgMi4yMyAyLjIzIDAgMCAwLS4xOS45djEuMjlhOC4yNCA4LjI0IDAgMCAxIDAgMS4yNiA0LjY3IDQuNjcgMCAwIDEtLjI5IDEuMTggMy4wOSAzLjA5IDAgMCAxLS43MSAxLjA2IDMuNDEgMy40MSAwIDAgMS0xLjE0Ljc1IDMuNDkgMy40OSAwIDAgMS0xLjM0LjI2di0xLjE1YTIuMjQgMi4yNCAwIDAgMCAuOS0uMTkgMi4zNiAyLjM2IDAgMCAwIDEuMjQtMS4yNCAyLjIyIDIuMjIgMCAwIDAgLjE5LS45di0yYTcgNyAwIDAgMSAuMDctLjg4IDMuNzUgMy43NSAwIDAgMSAuMjUtLjg2IDMuMjkgMy4yOSAwIDAgMSAuNDctLjc4IDMuNDggMy40OCAwIDAgMSAuNzctLjY5IDMuNDQgMy40NCAwIDAgMS0uNzgtLjY3IDMuMjcgMy4yNyAwIDAgMS0uNDctLjc4IDMuNzMgMy43MyAwIDAgMS0uMjUtLjg2IDcgNyAwIDAgMS0uMDktLjkzdi0yYTIuMjMgMi4yMyAwIDAgMC0uMTktLjkgMi4zNSAyLjM1IDAgMCAwLTEuMjQtMS4yNCAyLjIyIDIuMjIgMCAwIDAtLjktLjE5di0xLjE2eiIvPg0KIDwvZz4NCjwvc3ZnPg0K',
    brandColor: '#8C6CFF',
    description: 'Chunk text to a fixed length.',
    summary: 'Chunk text',

    inputs: {
      type: 'object',
      properties: {
        chunkingStrategy: {
          title: 'Chunking strategy',
          type: 'string',
          description: 'Chunking strategy to be used.',
          default: 'TokenSize',
          enum: ['TokenSize'],
        },
        text: {
          title: 'Text',
          description: 'Text to be chunked.',
          type: 'string',
        },
        encodingModel: {
          title: 'Encoding model',
          type: 'string',
          description: 'The encoding model to use fro chunking.',
          default: 'cl100k_base',
          'x-ms-editor': 'dropdown',
          'x-ms-editor-options': {
            multiSelect: false,
            titleSeperator: ',',
            options: [
              {
                value: 'r50k_base',
                displayName: 'r50k_base (gpt-3)',
              },
              {
                value: 'p50k_base',
                displayName: 'p50k_base (gpt-3)',
              },
              {
                value: 'p50k_edit',
                displayName: 'p50k_edit (gpt-3)',
              },
              {
                value: 'cl100k_base',
                displayName: 'cl100k_base (gpt-4, gpt-3.5-turbo, gpt-35-turbo)',
              },
              {
                value: 'cl200k_base',
                displayName: 'cl200k_base (gpt-4o)',
              },
            ],
          },
        },
        tokenSize: {
          title: 'Token size',
          type: 'integer',
          description: 'The maximum number of tokens per chunk. 100 tokens equals about 75 words.',
          minimum: 1,
          default: 5000,
          maximum: 8000,
        },
        pageOverlapLength: {
          title: 'Page overlap length',
          type: 'integer',
          description: 'The number of chracters to overlap between pages.',
          minumum: 0,
          default: 0,
        },
      },
      required: ['chunkingStrategy', 'text', 'encodingModel', 'tokenSize', 'pageOverlapLength'],
    },

    isInputsOptional: false,
    isOutputOptional: false,
    includeRootOutputs: false,

    outputs: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          title: 'Chunked result',
          description: 'An object containing chunked text.',
          properties: {
            value: {
              type: 'array',
              title: 'Text items',
              description: 'Array of chunked text.',
            },
          },
        },
      },
    },
    
    connector: {
      id: 'connectionProviders/dataOperationNew',
      name: 'dataOperationNew',
      properties: {
        description: 'Operations to work with data in workflow.',
        displayName: 'Data Operations',
      },
    } as any,

    settings: {
      secureData: {
        options: {
          outputsMode: OutputSecureDataMode.LinkedToInputs,
        },
      },
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
