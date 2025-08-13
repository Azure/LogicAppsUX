import type { OperationManifest } from '../../../../utils/src';

export default {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmdHcmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM3MDk3Mjc7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzVhN2ExZjtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0idXJsKCNiZ0dyYWRpZW50KSIvPgogPGcgZmlsbD0iI2ZmZiI+CiAgPHBhdGggZD0iTTkuNTYxNTggM0M1LjQxOTQ0IDMgMi4wNjE1OCA2LjM1Nzg2IDIuMDYxNTggMTAuNUMyLjA2MTU4IDExLjYzMjkgMi4zMTMyNSAxMi43MDg4IDIuNzY0MjMgMTMuNjczNEMyLjUxMDIgMTQuNjcxNCAyLjIyNjM4IDE1Ljc4NDIgMi4wMzk5OSAxNi41MTQ3QzEuODA2OTcgMTcuNDI4IDIuNjI5NCAxOC4yNTg4IDMuNTQzNzQgMTguMDM5QzQuMjkzOTYgMTcuODU4NyA1LjQ0Njk5IDE3LjU4MTkgNi40NzQ0NyAxNy4zMzdDNy40MTY3OCAxNy43NjMxIDguNDYyNDEgMTggOS41NjE1OCAxOEMxMy43MDM3IDE4IDE3LjA2MTYgMTQuNjQyMSAxNy4wNjE2IDEwLjVDMTcuMDYxNiA2LjM1Nzg2IDEzLjcwMzcgMyA5LjU2MTU4IDNaTTMuNTYxNTggMTAuNUMzLjU2MTU4IDcuMTg2MjkgNi4yNDc4NyA0LjUgOS41NjE1OCA0LjVDMTIuODc1MyA0LjUgMTUuNTYxNiA3LjE4NjI5IDE1LjU2MTYgMTAuNUMxNS41NjE2IDEzLjgxMzcgMTIuODc1MyAxNi41IDkuNTYxNTggMTYuNUM4LjYwMDg0IDE2LjUgNy42OTQ4NyAxNi4yNzQ4IDYuODkxNjEgMTUuODc0OUw2LjY0ODIgMTUuNzUzN0w2LjM4MzY4IDE1LjgxNjdDNS40NjA5NSAxNi4wMzYzIDQuMzk0ODkgMTYuMjkxOSAzLjU5NTkyIDE2LjQ4MzhDMy43OTQ2NyAxNS43MDQ3IDQuMDU3ODQgMTQuNjcyNCA0LjI4NjAxIDEzLjc3NTdMNC4zNTYxOSAxMy40OTk4TDQuMjI1NjggMTMuMjQ2OEMzLjgwMTQ1IDEyLjQyNDYgMy41NjE1OCAxMS40OTE0IDMuNTYxNTggMTAuNVpNMTQuNTYxNiAyMS4wMDAxQzEyLjU5MjIgMjEuMDAwMSAxMC44MDAxIDIwLjI0MSA5LjQ2MTkxIDE4Ljk5OTVDOS40OTUxMSAxOC45OTk5IDkuNTI4MzUgMTkuMDAwMSA5LjU2MTYzIDE5LjAwMDFDMTAuMjc5NiAxOS4wMDAxIDEwLjk3NjggMTguOTExIDExLjY0MjcgMTguNzQzNEMxMi41MDY3IDE5LjIyNTQgMTMuNTAyMSAxOS41MDAxIDE0LjU2MTYgMTkuNTAwMUMxNS41MjIzIDE5LjUwMDEgMTYuNDI4MyAxOS4yNzQ4IDE3LjIzMTYgMTguODc0OUwxNy40NzUgMTguNzUzN0wxNy43Mzk1IDE4LjgxNjdDMTguNjYxMSAxOS4wMzYxIDE5LjcwNDYgMTkuMjYyNSAyMC40Nzg3IDE5LjQyNjJDMjAuMzAzNyAxOC42NzU3IDIwLjA2NSAxNy42NzExIDE5LjgzNzIgMTYuNzc1N0wxOS43NjcgMTYuNDk5OUwxOS44OTc1IDE2LjI0NjlDMjAuMzIxNyAxNS40MjQ3IDIwLjU2MTYgMTQuNDkxNSAyMC41NjE2IDEzLjUwMDFDMjAuNTYxNiAxMS4zODUzIDE5LjQ2NzYgOS41MjYxNyAxNy44MTQ2IDguNDU3NjFDMTcuNjM2MyA3LjczNDM1IDE3LjM2NTMgNy4wNDc1NiAxNy4wMTUgNi40MTA1MkMxOS45NTIzIDcuNDI2ODQgMjIuMDYxNiAxMC4yMTcxIDIyLjA2MTYgMTMuNTAwMUMyMi4wNjE2IDE0LjYzMzIgMjEuODA5OCAxNS43MDk0IDIxLjM1ODYgMTYuNjc0MUMyMS42MTE3IDE3LjY4MjEgMjEuODY3OSAxOC43NzQgMjIuMDMwNCAxOS40NzczQzIyLjIzNDggMjAuMzYyMyAyMS40NTU0IDIxLjE2MzMgMjAuNTYzIDIwLjk3NjhDMTkuODM1OCAyMC44MjQ4IDE4LjY5MzMgMjAuNTgxIDE3LjY0OTUgMjAuMzM2N0MxNi43MDcgMjAuNzYzIDE1LjY2MTEgMjEuMDAwMSAxNC41NjE2IDIxLjAwMDFaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0LCA1KSIgLz4KIDwvZz4KPC9zdmc+',
    brandColor: '#709727',
    summary: 'On agent HTTP request',
    description: 'Triggers the flow when an HTTP request is received from a trusted agent or system as part of an A2A integration.',

    inputs: {
      type: 'object',
      properties: {
        agentUrl: {
          type: 'string',
          title: 'Agent URL',
          description: 'URL will be generated after save',
          'x-ms-visiblity': 'important',
          'x-ms-editor': 'copyable',
          'x-ms-serialization': {
            skip: true,
          },
          'x-ms-editor-options': {
            addPopUp: true,
          },
        },
        name: {
          type: 'string',
          title: 'Name',
          description: 'Enter a name for this A2A request',
          'x-ms-visibility': 'important',
        },
        description: {
          type: 'string',
          title: 'Description',
          description: 'Enter a description for this A2A request',
          'x-ms-visibility': 'important',
        },
      },
      required: [],
    },
    inputsLocation: ['inputs'],
    isInputsOptional: false,

    connector: {
      id: 'connectionProviders/a2a',
      name: 'a2aRequest',
      properties: {
        description: 'Operations to receive and respond to HTTP requests from trusted agents in an A2A integration.',
        displayName: 'Agent Request',
      },
    } as any,
  },
} as OperationManifest;
