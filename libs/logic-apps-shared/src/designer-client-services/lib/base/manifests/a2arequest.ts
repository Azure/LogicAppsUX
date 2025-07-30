import type { OperationManifest } from '../../../../utils/src';

export default {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmdHcmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMDc4ZDQ7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzAwNWE5ZTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9InVybCgjYmdHcmFkaWVudCkiLz4KICA8cGF0aCBkPSJNOS41NjE1OCAzQzUuNDE5NDQgMyAyLjA2MTU4IDYuMzU3ODYgMi4wNjE1OCAxMC41QzIuMDYxNTggMTEuNjMyOSAyLjMxMzI1IDEyLjcwODggMi43NjQyMyAxMy42NzM0QzIuNTEwMiAxNC42NzE0IDIuMjI2MzggMTUuNzg0MiAyLjAzOTk5IDE2LjUxNDdDMS44MDY5NyAxNy40MjggMi42Mjk0IDE4LjI1ODggMy41NDM3NCAxOC4wMzlDNC4yOTM5NiAxNy44NTg3IDUuNDQ2OTkgMTcuNTgxOSA2LjQ3NDQ3IDE3LjMzN0M3LjQxNjc4IDE3Ljc2MzEgOC40NjI0MSAxOCA5LjU2MTU4IDE4QzEzLjcwMzcgMTggMTcuMDYxNiAxNC42NDIxIDE3LjA2MTYgMTAuNUMxNy4wNjE2IDYuMzU3ODYgMTMuNzAzNyAzIDkuNTYxNTggM1pNMy41NjE1OCAxMC41QzMuNTYxNTggNy4xODYyOSA2LjI0Nzg3IDQuNSA5LjU2MTU4IDQuNUMxMi44NzUzIDQuNSAxNS41NjE2IDcuMTg2MjkgMTUuNTYxNiAxMC41QzE1LjU2MTYgMTMuODEzNyAxMi44NzUzIDE2LjUgOS41NjE1OCAxNi41QzguNjAwODQgMTYuNSA3LjY5NDg3IDE2LjI3NDggNi44OTE2MSAxNS44NzQ5TDYuNjQ4MiAxNS43NTM3TDYuMzgzNjggMTUuODE2N0M1LjQ2MDk1IDE2LjAzNjMgNC4zOTQ4OSAxNi4yOTE5IDMuNTk1OTIgMTYuNDgzOEMzLjc5NDY3IDE1LjcwNDcgNC4wNTc4NCAxNC42NzI0IDQuMjg2MDEgMTMuNzc1N0w0LjM1NjE5IDEzLjQ5OThMNC4yMjU2OCAxMy4yNDY4QzMuODAxNDUgMTIuNDI0NiAzLjU2MTU4IDExLjQ5MTQgMy41NjE1OCAxMC41Wk0xNC41NjE2IDIxLjAwMDFDMTIuNTkyMiAyMS4wMDAxIDEwLjgwMDEgMjAuMjQxIDkuNDYxOTEgMTguOTk5NUM5LjQ5NTExIDE4Ljk5OTkgOS41MjgzNSAxOS4wMDAxIDkuNTYxNjMgMTkuMDAwMUMxMC4yNzk2IDE5LjAwMDEgMTAuOTc2OCAxOC45MTEgMTEuNjQyNyAxOC43NDM0QzEyLjUwNjcgMTkuMjI1NCAxMy41MDIxIDE5LjUwMDEgMTQuNTYxNiAxOS41MDAxQzE1LjUyMjMgMTkuNTAwMSAxNi40MjgzIDE5LjI3NDggMTcuMjMxNiAxOC44NzQ5TDE3LjQ3NSAxOC43NTM3TDE3LjczOTUgMTguODE2N0MxOC42NjExIDE5LjAzNjEgMTkuNzA0NiAxOS4yNjI1IDIwLjQ3ODcgMTkuNDI2MkMyMC4zMDM3IDE4LjY3NTcgMjAuMDY1IDE3LjY3MTEgMTkuODM3MiAxNi43NzU3TDE5Ljc2NyAxNi40OTk5TDE5Ljg5NzUgMTYuMjQ2OUMyMC4zMjE3IDE1LjQyNDcgMjAuNTYxNiAxNC40OTE1IDIwLjU2MTYgMTMuNTAwMUMyMC41NjE2IDExLjM4NTMgMTkuNDY3NiA5LjUyNjE3IDE3LjgxNDYgOC40NTc2MUMxNy42MzYzIDcuNzM0MzUgMTcuMzY1MyA3LjA0NzU2IDE3LjAxNSA2LjQxMDUyQzE5Ljk1MjMgNy40MjY4NCAyMi4wNjE2IDEwLjIxNzEgMjIuMDYxNiAxMy41MDAxQzIyLjA2MTYgMTQuNjMzMiAyMS44MDk4IDE1LjcwOTQgMjEuMzU4NiAxNi42NzQxQzIxLjYxMTcgMTcuNjgyMSAyMS44Njc5IDE4Ljc3NCAyMi4wMzA0IDE5LjQ3NzNDMjIuMjM0OCAyMC4zNjIzIDIxLjQ1NTQgMjEuMTYzMyAyMC41NjMgMjAuOTc2OEMxOS44MzU4IDIwLjgyNDggMTguNjkzMyAyMC41ODEgMTcuNjQ5NSAyMC4zMzY3QzE2LjcwNyAyMC43NjMgMTUuNjYxMSAyMS4wMDAxIDE0LjU2MTYgMjEuMDAwMVoiIGZpbGw9IndoaXRlIiAvPgo8L3N2Zz4=',
    brandColor: '#1a1a2e',
    summary: 'On agent HTTP request',
    description: 'Triggers the flow when an HTTP request is received from a trusted agent or system as part of an A2A integration.',

    inputs: {
      type: 'object',
      properties: {
        callbackUrl: {
          type: 'string',
          title: 'HTTP URL',
          description: 'URL will be generated after save',
          'x-ms-visiblity': 'important',
          'x-ms-editor': 'copyable',
          'x-ms-serialization': {
            skip: true,
          },
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
