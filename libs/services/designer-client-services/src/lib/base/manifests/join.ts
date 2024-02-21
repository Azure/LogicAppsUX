import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { SettingScope } from '@microsoft/logic-apps-shared';

export default {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cGF0aCBmaWxsPSIjOEM2Q0ZGIiBkPSJtMCAwaDMydjMyaC0zMnoiLz4NCiA8ZyBmaWxsPSIjZmZmIj4NCiAgPHBhdGggZD0iTTEzLjE4NyAxNC4wNzloNi4xODd2LjY2NGwtMi4zMjEgMi4zMzd2Mi40MDFoLTEuNTQ1di0yLjQwMWwtMi4zMjEtMi4zMjF6bTUuODAzLjQ5NnYtLjExMmgtNS4zODd2LjExMmwyLjMyMSAyLjMyMXYyLjIwOWguOHYtMi4yMDl6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIuMjUiLz4NCiAgPHBhdGggdHJhbnNmb3JtPSJtYXRyaXgoLjggMCAwIC44IDMuMTk4IDIuNjczKSIgZD0iTTYgMTYuMDdhMi4yNCAyLjI0IDAgMCAwIC45LS4xOSAyLjM2IDIuMzYgMCAwIDAgMS4yNC0xLjI0IDIuMjIgMi4yMiAwIDAgMCAuMTktLjl2LTEuMjlhOC4yMiA4LjIyIDAgMCAxIDAtMS4yNiA0LjY4IDQuNjggMCAwIDEgLjMtMS4xOSAzLjA5IDMuMDkgMCAwIDEgLjcxLTEgMy40MiAzLjQyIDAgMCAxIDEuMTQtLjc1IDMuNTEgMy41MSAwIDAgMSAxLjM0LS4yNnYxLjExYTIuMjEgMi4yMSAwIDAgMC0uOS4xOSAyLjM2IDIuMzYgMCAwIDAtMS4yNCAxLjI0IDIuMjMgMi4yMyAwIDAgMC0uMTkuOXYyYTcgNyAwIDAgMS0uMDkuOTMgMy43MyAzLjczIDAgMCAxLS4yNS44NiAzLjI3IDMuMjcgMCAwIDEtLjQ3Ljc4IDMuNDQgMy40NCAwIDAgMS0uNzcuNjkgMy40OCAzLjQ4IDAgMCAxIC43Ny42OSAzLjI5IDMuMjkgMCAwIDEgLjQ3Ljc4IDMuNzUgMy43NSAwIDAgMSAuMjUuODYgNyA3IDAgMCAxIC4wOS45M3YyYTIuMjIgMi4yMiAwIDAgMCAuMTkuOSAyLjM3IDIuMzcgMCAwIDAgMS4yMyAxLjE1IDIuMjIgMi4yMiAwIDAgMCAuOS4xOXYxLjE2YTMuNDkgMy40OSAwIDAgMS0xLjM0LS4yNiAzLjQxIDMuNDEgMCAwIDEtMS4xNC0uNzUgMy4wOSAzLjA5IDAgMCAxLS43MS0xLjA2IDQuNjcgNC42NyAwIDAgMS0uMjktMS4xOCA4LjI0IDguMjQgMCAwIDEgMC0xLjI2di0xLjI5YTIuMjMgMi4yMyAwIDAgMC0uMTktLjkgMi4zNSAyLjM1IDAgMCAwLTEuMjQtMS4yMyAyLjIyIDIuMjIgMCAwIDAtLjktLjE4em0xNC4xOS04LjEzYTMuNTEgMy41MSAwIDAgMSAxLjM0LjI2IDMuNDIgMy40MiAwIDAgMSAxLjEzLjggMy4wOSAzLjA5IDAgMCAxIC43MSAxIDQuNjggNC42OCAwIDAgMSAuMjkgMS4xOSA4LjIyIDguMjIgMCAwIDEgMCAxLjI2djEuMjlhMi4yMiAyLjIyIDAgMCAwIC4xOS45IDIuMzcgMi4zNyAwIDAgMCAxLjI0IDEuMjQgMi4yMiAyLjIyIDAgMCAwIC45LjE5djEuMTZhMi4yMSAyLjIxIDAgMCAwLS45LjE5IDIuMzYgMi4zNiAwIDAgMC0xLjI0IDEuMjQgMi4yMyAyLjIzIDAgMCAwLS4xOS45djEuMjlhOC4yNCA4LjI0IDAgMCAxIDAgMS4yNiA0LjY3IDQuNjcgMCAwIDEtLjI5IDEuMTggMy4wOSAzLjA5IDAgMCAxLS43MSAxLjA2IDMuNDEgMy40MSAwIDAgMS0xLjE0Ljc1IDMuNDkgMy40OSAwIDAgMS0xLjM0LjI2di0xLjE1YTIuMjQgMi4yNCAwIDAgMCAuOS0uMTkgMi4zNiAyLjM2IDAgMCAwIDEuMjQtMS4yNCAyLjIyIDIuMjIgMCAwIDAgLjE5LS45di0yYTcgNyAwIDAgMSAuMDctLjg4IDMuNzUgMy43NSAwIDAgMSAuMjUtLjg2IDMuMjkgMy4yOSAwIDAgMSAuNDctLjc4IDMuNDggMy40OCAwIDAgMSAuNzctLjY5IDMuNDQgMy40NCAwIDAgMS0uNzgtLjY3IDMuMjcgMy4yNyAwIDAgMS0uNDctLjc4IDMuNzMgMy43MyAwIDAgMS0uMjUtLjg2IDcgNyAwIDAgMS0uMDktLjkzdi0yYTIuMjMgMi4yMyAwIDAgMC0uMTktLjkgMi4zNSAyLjM1IDAgMCAwLTEuMjQtMS4yNCAyLjIyIDIuMjIgMCAwIDAtLjktLjE5di0xLjE2eiIvPg0KIDwvZz4NCjwvc3ZnPg0K',
    brandColor: '#8C6CFF',
    description: 'Joins all the elements of an array into a string, using the specified "Join with" separator between each element.',
    summary: 'Join',

    inputs: {
      type: 'object',
      properties: {
        from: {
          type: 'array',
          title: 'From',
          required: true,
          description: 'Array to join',
        },
        joinWith: {
          type: 'string',
          title: 'Join with',
          required: true,
          description: 'Join with separator',
        },
      },
      required: ['from', 'joinWith'],
    },
    inputsLocation: ['inputs'],
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'string',
          title: 'Output',
        },
      },
    },
    isOutputsOptional: false,

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
