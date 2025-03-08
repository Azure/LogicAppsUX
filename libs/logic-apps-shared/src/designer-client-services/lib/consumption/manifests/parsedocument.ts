import type { OperationManifest } from '../../../../utils/src';
import { SettingScope } from '../../../../utils/src';

export const parseDocumentManifest = {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KIDxwYXRoIGZpbGw9IiM4QzZDRkYiIGQ9Im0wIDBoMzJ2MzJoLTMyeiIvPgogPGcgZmlsbD0iI2ZmZiI+CiAgPHBhdGggdHJhbnNmb3JtPSJtYXRyaXgoLjggMCAwIC44IDMuMTk4IDIuNjczKSIgZD0iTTYgMTYuMDdhMi4yNCAyLjI0IDAgMCAwIC45LS4xOSAyLjM2IDIuMzYgMCAwIDAgMS4yNC0xLjI0IDIuMjIgMi4yMiAwIDAgMCAuMTktLjl2LTEuMjlhOC4yMiA4LjIyIDAgMCAxIDAtMS4yNiA0LjY4IDQuNjggMCAwIDEgLjMtMS4xOSAzLjA5IDMuMDkgMCAwIDEgLjcxLTEgMy40MiAzLjQyIDAgMCAxIDEuMTQtLjc1IDMuNTEgMy41MSAwIDAgMSAxLjM0LS4yNnYxLjExYTIuMjEgMi4yMSAwIDAgMC0uOS4xOSAyLjM2IDIuMzYgMCAwIDAtMS4yNCAxLjI0IDIuMjMgMi4yMyAwIDAgMC0uMTkuOXYyYTcgNyAwIDAgMS0uMDkuOTMgMy43MyAzLjczIDAgMCAxLS4yNS44NiAzLjI3IDMuMjcgMCAwIDEtLjQ3Ljc4IDMuNDQgMy40NCAwIDAgMS0uNzcuNjkgMy40OCAzLjQ4IDAgMCAxIC43Ny42OSAzLjI5IDMuMjkgMCAwIDEgLjQ3Ljc4IDMuNzUgMy43NSAwIDAgMSAuMjUuODYgNyA3IDAgMCAxIC4wOS45M3YyYTIuMjIgMi4yMiAwIDAgMCAuMTkuOSAyLjM3IDIuMzcgMCAwIDAgMS4yMyAxLjE1IDIuMjIgMi4yMiAwIDAgMCAuOS4xOXYxLjE2YTMuNDkgMy40OSAwIDAgMS0xLjM0LS4yNiAzLjQxIDMuNDEgMCAwIDEtMS4xNC0uNzUgMy4wOSAzLjA5IDAgMCAxLS43MS0xLjA2IDQuNjcgNC42NyAwIDAgMS0uMjktMS4xOCA4LjI0IDguMjQgMCAwIDEgMC0xLjI2di0xLjI5YTIuMjMgMi4yMyAwIDAgMC0uMTktLjkgMi4zNSAyLjM1IDAgMCAwLTEuMjQtMS4yMyAyLjIyIDIuMjIgMCAwIDAtLjktLjE4em0xNC4xOS04LjEzYTMuNTEgMy41MSAwIDAgMSAxLjM0LjI2IDMuNDIgMy40MiAwIDAgMSAxLjEzLjggMy4wOSAzLjA5IDAgMCAxIC43MSAxIDQuNjggNC42OCAwIDAgMSAuMjkgMS4xOSA4LjIyIDguMjIgMCAwIDEgMCAxLjI2djEuMjlhMi4yMiAyLjIyIDAgMCAwIC4xOS45IDIuMzcgMi4zNyAwIDAgMCAxLjI0IDEuMjQgMi4yMiAyLjIyIDAgMCAwIC45LjE5djEuMTZhMi4yMSAyLjIxIDAgMCAwLS45LjE5IDIuMzYgMi4zNiAwIDAgMC0xLjI0IDEuMjQgMi4yMyAyLjIzIDAgMCAwLS4xOS45djEuMjlhOC4yNCA4LjI0IDAgMCAxIDAgMS4yNiA0LjY3IDQuNjcgMCAwIDEtLjI5IDEuMTggMy4wOSAzLjA5IDAgMCAxLS43MSAxLjA2IDMuNDEgMy40MSAwIDAgMS0xLjE0Ljc1IDMuNDkgMy40OSAwIDAgMS0xLjM0LjI2di0xLjE1YTIuMjQgMi4yNCAwIDAgMCAuOS0uMTkgMi4zNiAyLjM2IDAgMCAwIDEuMjQtMS4yNCAyLjIyIDIuMjIgMCAwIDAgLjE5LS45di0yYTcgNyAwIDAgMSAuMDctLjg4IDMuNzUgMy43NSAwIDAgMSAuMjUtLjg2IDMuMjkgMy4yOSAwIDAgMSAuNDctLjc4IDMuNDggMy40OCAwIDAgMSAuNzctLjY5IDMuNDQgMy40NCAwIDAgMS0uNzgtLjY3IDMuMjcgMy4yNyAwIDAgMS0uNDctLjc4IDMuNzMgMy43MyAwIDAgMS0uMjUtLjg2IDcgNyAwIDAgMS0uMDktLjkzdi0yYTIuMjMgMi4yMyAwIDAgMC0uMTktLjkgMi4zNSAyLjM1IDAgMCAwLTEuMjQtMS4yNCAyLjIyIDIuMjIgMCAwIDAtLjktLjE5di0xLjE2eiIvPgogIDxwYXRoIHRyYW5zZm9ybT0ibWF0cml4KC44IDAgMCAuOCAzLjE5OCAyLjY3MykiIGQ9Ik0yMC4xMiAxNGExLjI5IDEuMjkgMCAwIDEtLjA5LjQ4IDEuMjEgMS4yMSAwIDAgMS0uMjguNDJsLTUgNS0yLjM5LjYuNjQtMi40IDUtNWExLjI1IDEuMjUgMCAwIDEgLjQyLS4yOCAxLjI5IDEuMjkgMCAwIDEgLjQ4LS4wOSAxLjIyIDEuMjIgMCAwIDEgLjQ5LjEgMS4yNyAxLjI3IDAgMCAxIC42Ny42NyAxLjIyIDEuMjIgMCAwIDEgLjA2LjV6bS03LjA3IDUuOGwxLjI0LS4zMWExLjIyIDEuMjIgMCAwIDAtLjkzLS45M3ptLjU3LTEuNjhhMS43MiAxLjcyIDAgMCAxIDEuMTEgMS4xMWw0LjA4LTQuMDgtMS4xMS0xLjExem01LjUzLTMuMzJsLjE4LS4xOGExLjM3IDEuMzcgMCAwIDAgLjE2LS4xOC43OC43OCAwIDAgMCAuMTEtLjIuNzIuNzIgMCAwIDAgMC0uMjUuNzYuNzYgMCAwIDAtLjA2LS4zLjc4Ljc4IDAgMCAwLS4xNy0uMjUuODMuODMgMCAwIDAtLjI1LS4xNy43Ni43NiAwIDAgMC0uMy0uMDYuNzIuNzIgMCAwIDAtLjI1IDAgLjgyLjgyIDAgMCAwLS4yLjExbC0uMTguMTYtLjE5LjI1eiIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHN0cm9rZS13aWR0aD0iLjI1Ii8+CiA8L2c+Cjwvc3ZnPgo=',
    brandColor: '#8C6CFF',
    description: 'Parse a document to extract text from the document.',
    summary: 'Parse a document',

    inputs: {
      type: 'object',
      properties: {
        content: {
          title: 'Document content',
          description: 'Content of the document to be parsed.',
        },
      },
      required: ['content'],
    },

    isInputsOptional: false,
    isOutputOptional: false,
    includeRootOutputs: false,

    outputs: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          title: 'Parsed result',
          description: 'An object containing parsed text.',
          properties: {
            text: {
              type: 'string',
              title: 'text',
              description: 'Parsed document content in text form.',
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
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
