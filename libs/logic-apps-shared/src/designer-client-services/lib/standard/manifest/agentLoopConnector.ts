import type { Connector } from '../../../../utils/src';

export default {
  type: 'AgentConnection',
  name: 'agent',
  id: 'connectionProviders/agent',
  properties: {
    displayName: 'Agent',
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjIiIGhlaWdodD0iMjIiIHZpZXdCb3g9IjAgMCAyMiAyMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIyIiBoZWlnaHQ9IjIyIiByeD0iMiIgZmlsbD0iIzMzNTJCOSIvPgo8ZyBjbGlwLXBhdGg9InVybCgjY2xpcDBfMTA4OF80OTQwMCkiPgo8cGF0aCBkPSJNOC4wMzEzNyAxMC4zODE4QzcuODE5NzggMTAuMzgxOCA3LjYxODc3IDEwLjMzODIgNy40MjgzNCAxMC4yNTA5QzcuMjM3OTEgMTAuMTYzNiA3LjA2ODY0IDEwLjA0MzcgNi45MjA1MyA5Ljg5MDk0QzYuNzcyNDEgOS43MzgyMiA2LjY1NjA0IDkuNTYzNjggNi41NzE0MSA5LjM2NzMzQzYuNDg2NzcgOS4xNzA5OCA2LjQ0MjM0IDguOTYxNTQgNi40MzgxIDguNzM5MDFWNi4xNjAyNkM2LjQzODEgNS45MzMzNyA2LjQ4MjU0IDUuNzIxNzQgNi41NzE0MSA1LjUyNTM5QzYuNjYwMjcgNS4zMjkwNCA2Ljc3ODc2IDUuMTU0NSA2LjkyNjg3IDUuMDAxNzlDNy4wNzQ5OSA0Ljg0OTA3IDcuMjQ2MzcgNC43MzEyNiA3LjQ0MTAzIDQuNjQ4MzVDNy42MzU3IDQuNTY1NDUgNy44NDMwNSA0LjUyMTgyIDguMDYzMSA0LjUxNzQ1SDEwLjA5NDRWNC40MTI3M0MxMC4wOTQ0IDQuMzc3ODMgMTAuMDkyMiA0LjMzODU2IDEwLjA4OCA0LjI5NDkyQzEwLjA4OCA0LjIyMDc0IDEwLjA5MjIgNC4xNDg3NSAxMC4xMDA3IDQuMDc4OTRDMTAuMTA5MiA0LjAwOTEyIDEwLjEyNjEgMy45NDM2NyAxMC4xNTE1IDMuODgyNThDMTAuMTc2OSAzLjgyMTUgMTAuMjE5MiAzLjc3MzUgMTAuMjc4NCAzLjczODU5QzEwLjMzNzcgMy43MDM2OSAxMC40MTE3IDMuNjg0MDUgMTAuNTAwNiAzLjY3OTY5QzEwLjU5MzcgMy42Nzk2OSAxMC42NjU2IDMuNjk3MTQgMTAuNzE2NCAzLjczMjA1QzEwLjc2NzIgMy43NjY5NSAxMC44MDc0IDMuODE0OTUgMTAuODM3IDMuODc2MDRDMTAuODY2NyAzLjkzNzEzIDEwLjg4NTcgNC4wMDI1OCAxMC44OTQyIDQuMDcyMzlDMTAuOTAyNiA0LjE0MjIgMTAuOTA2OSA0LjIxNjM4IDEwLjkwNjkgNC4yOTQ5MlY0LjUxNzQ1SDEyLjk2OThDMTMuMTgxNCA0LjUxNzQ1IDEzLjM4MjQgNC41NjEwOSAxMy41NzI5IDQuNjQ4MzVDMTMuNzYzMyA0LjczNTYyIDEzLjkzMjYgNC44NTU2MSAxNC4wODA3IDUuMDA4MzNDMTQuMjI4OCA1LjE2MTA1IDE0LjM0NTIgNS4zMzU1OCAxNC40Mjk4IDUuNTMxOTRDMTQuNTE0NCA1LjcyODI5IDE0LjU1ODkgNS45Mzc3MyAxNC41NjMxIDYuMTYwMjZWOC43MzkwMUMxNC41NjMxIDguOTU3MTggMTQuNTIwOCA5LjE2NDQ0IDE0LjQzNjIgOS4zNjA3OUMxNC4zNTE1IDkuNTU3MTQgMTQuMjM1MSA5LjczMTY3IDE0LjA4NyA5Ljg4NDM5QzEzLjkzODkgMTAuMDM3MSAxMy43Njk2IDEwLjE1NzEgMTMuNTc5MiAxMC4yNDQ0QzEzLjM4ODggMTAuMzMxNiAxMy4xODU3IDEwLjM3NzUgMTIuOTY5OCAxMC4zODE4SDguMDMxMzdaTTcuMjUwNiA4LjcwNjI4QzcuMjUwNiA4LjgyNDA5IDcuMjcxNzYgOC45MzMxOCA3LjMxNDA4IDkuMDMzNTRDNy4zNTY0IDkuMTMzODkgNy40MTM1MyA5LjIyMzM0IDcuNDg1NDcgOS4zMDE4OEM3LjU1NzQxIDkuMzgwNDIgNy42NDIwNCA5LjQzOTMzIDcuNzM5MzcgOS40Nzg2QzcuODM2NyA5LjUxNzg3IDcuOTQ0NjEgOS41Mzk2OSA4LjA2MzEgOS41NDQwNUgxMi45MzgxQzEzLjA1MjQgOS41NDQwNSAxMy4xNTgyIDkuNTIyMjMgMTMuMjU1NSA5LjQ3ODZDMTMuMzUyOCA5LjQzNDk3IDEzLjQzNzUgOS4zNzYwNiAxMy41MDk0IDkuMzAxODhDMTMuNTgxMyA5LjIyNzcxIDEzLjY0MDYgOS4xMzgyNiAxMy42ODcxIDkuMDMzNTRDMTMuNzMzNyA4LjkyODgxIDEzLjc1NDggOC44MTk3MyAxMy43NTA2IDguNzA2MjhWNi4xOTI5OUMxMy43NTA2IDYuMDc5NTQgMTMuNzI5NCA1Ljk3MjY0IDEzLjY4NzEgNS44NzIyOEMxMy42NDQ4IDUuNzcxOTIgMTMuNTg3NyA1LjY4MjQ3IDEzLjUxNTcgNS42MDM5M0MxMy40NDM4IDUuNTI1MzkgMTMuMzU3IDUuNDY0MyAxMy4yNTU1IDUuNDIwNjdDMTMuMTUzOSA1LjM3NzA0IDEzLjA0ODEgNS4zNTUyMiAxMi45MzgxIDUuMzU1MjJIOC4wNjMxQzcuOTQ4ODUgNS4zNTUyMiA3Ljg0MzA1IDUuMzc3MDQgNy43NDU3MiA1LjQyMDY3QzcuNjQ4MzkgNS40NjQzIDcuNTYzNzYgNS41MjMyMSA3LjQ5MTgyIDUuNTk3MzlDNy40MTk4OCA1LjY3MTU2IDcuMzYwNjMgNS43NjEwMSA3LjMxNDA4IDUuODY1NzNDNy4yNjc1MyA1Ljk3MDQ1IDcuMjQ2MzcgNi4wNzk1NCA3LjI1MDYgNi4xOTI5OVY4LjcwNjI4Wk04LjA2MzEgNy40NDk2M0M4LjA2MzEgNy4zMzE4MiA4LjA4NDI2IDcuMjIyNzQgOC4xMjY1OCA3LjEyMjM4QzguMTY4OSA3LjAyMjAyIDguMjI2MDMgNi45MzQ3NiA4LjI5Nzk3IDYuODYwNThDOC4zNjk5MSA2Ljc4NjQgOC40NTY2NiA2LjcyNTMyIDguNTU4MjIgNi42NzczMkM4LjY1OTc4IDYuNjI5MzIgOC43NjU1OCA2LjYwNzUgOC44NzU2IDYuNjExODdDOC45ODU2MyA2LjYxMTg3IDkuMDg5MzEgNi42MzM2OSA5LjE4NjY0IDYuNjc3MzJDOS4yODM5NyA2LjcyMDk1IDkuMzcwNzIgNi43Nzk4NiA5LjQ0Njg5IDYuODU0MDNDOS41MjMwNyA2LjkyODIxIDkuNTgyMzEgNy4wMTc2NiA5LjYyNDYzIDcuMTIyMzhDOS42NjY5NCA3LjIyNzEgOS42ODgxIDcuMzM2MTkgOS42ODgxIDcuNDQ5NjNDOS42ODgxIDcuNTY3NDUgOS42NjY5NCA3LjY3NjUzIDkuNjI0NjMgNy43NzY4OUM5LjU4MjMxIDcuODc3MjQgOS41MjUxOCA3Ljk2NDUxIDkuNDUzMjQgOC4wMzg2OUM5LjM4MTMgOC4xMTI4NyA5LjI5NDU1IDguMTczOTUgOS4xOTI5OSA4LjIyMTk1QzkuMDkxNDIgOC4yNjk5NSA4Ljk4NTYzIDguMjkxNzYgOC44NzU2IDguMjg3NEM4Ljc2MTM1IDguMjg3NCA4LjY1NTU1IDguMjY1NTggOC41NTgyMiA4LjIyMTk1QzguNDYwODkgOC4xNzgzMiA4LjM3NDE0IDguMTE5NDEgOC4yOTc5NyA4LjA0NTIzQzguMjIxOCA3Ljk3MTA2IDguMTY0NjcgNy44ODM3OSA4LjEyNjU4IDcuNzgzNDNDOC4wODg0OSA3LjY4MzA3IDguMDY3MzQgNy41NzE4MSA4LjA2MzEgNy40NDk2M1pNMTEuMzEzMSA3LjQ0OTYzQzExLjMxMzEgNy4zMzE4MiAxMS4zMzQzIDcuMjIyNzQgMTEuMzc2NiA3LjEyMjM4QzExLjQxODkgNy4wMjIwMiAxMS40NzYgNi45MzQ3NiAxMS41NDggNi44NjA1OEMxMS42MTk5IDYuNzg2NCAxMS43MDY3IDYuNzI1MzIgMTEuODA4MiA2LjY3NzMyQzExLjkwOTggNi42MjkzMiAxMi4wMTU2IDYuNjA3NSAxMi4xMjU2IDYuNjExODdDMTIuMjM1NiA2LjYxMTg3IDEyLjMzOTMgNi42MzM2OSAxMi40MzY2IDYuNjc3MzJDMTIuNTM0IDYuNzIwOTUgMTIuNjIwNyA2Ljc3OTg2IDEyLjY5NjkgNi44NTQwM0MxMi43NzMxIDYuOTI4MjEgMTIuODMyMyA3LjAxNzY2IDEyLjg3NDYgNy4xMjIzOEMxMi45MTY5IDcuMjI3MSAxMi45MzgxIDcuMzM2MTkgMTIuOTM4MSA3LjQ0OTYzQzEyLjkzODEgNy41Njc0NSAxMi45MTY5IDcuNjc2NTMgMTIuODc0NiA3Ljc3Njg5QzEyLjgzMjMgNy44NzcyNCAxMi43NzUyIDcuOTY0NTEgMTIuNzAzMiA4LjAzODY5QzEyLjYzMTMgOC4xMTI4NyAxMi41NDQ1IDguMTczOTUgMTIuNDQzIDguMjIxOTVDMTIuMzQxNCA4LjI2OTk1IDEyLjIzNTYgOC4yOTE3NiAxMi4xMjU2IDguMjg3NEMxMi4wMTEzIDguMjg3NCAxMS45MDU2IDguMjY1NTggMTEuODA4MiA4LjIyMTk1QzExLjcxMDkgOC4xNzgzMiAxMS42MjQxIDguMTE5NDEgMTEuNTQ4IDguMDQ1MjNDMTEuNDcxOCA3Ljk3MTA2IDExLjQxNDcgNy44ODM3OSAxMS4zNzY2IDcuNzgzNDNDMTEuMzM4NSA3LjY4MzA3IDExLjMxNzMgNy41NzE4MSAxMS4zMTMxIDcuNDQ5NjNaTTE0LjU5NDggMTEuMjE5NkMxNC44MDY0IDExLjIxOTYgMTUuMDA3NCAxMS4yNjMyIDE1LjE5NzkgMTEuMzUwNUMxNS4zODgzIDExLjQzNzcgMTUuNTU3NiAxMS41NTc3IDE1LjcwNTcgMTEuNzEwNUMxNS44NTM4IDExLjg2MzIgMTUuOTcwMiAxMi4wMzc3IDE2LjA1NDggMTIuMjM0MUMxNi4xMzk0IDEyLjQzMDQgMTYuMTgzOSAxMi42Mzk5IDE2LjE4ODEgMTIuODYyNEMxNi4xODgxIDEzLjM5NDcgMTYuMTA3NyAxMy44NjgxIDE1Ljk0NjkgMTQuMjgyN0MxNS43ODYxIDE0LjY5NzIgMTUuNTY2IDE1LjA1OTMgMTUuMjg2NyAxNS4zNjkxQzE1LjAwNzQgMTUuNjc4OSAxNC42ODE2IDE1Ljk0NTEgMTQuMzA5MiAxNi4xNjc2QzEzLjkzNjggMTYuMzkwMiAxMy41NDExIDE2LjU2NjkgMTMuMTIyMiAxNi42OTc4QzEyLjcwMzIgMTYuODI4NyAxMi4yNjc0IDE2LjkyNjkgMTEuODE0NiAxNi45OTIzQzExLjM2MTggMTcuMDU3OCAxMC45MjM4IDE3LjA4ODMgMTAuNTAwNiAxNy4wODM5QzEwLjA2OSAxNy4wODM5IDkuNjI4ODYgMTcuMDUzNCA5LjE4MDI5IDE2Ljk5MjNDOC43MzE3MiAxNi45MzEyIDguMjk3OTcgMTYuODMzIDcuODc5MDIgMTYuNjk3OEM3LjQ2MDA4IDE2LjU2MjUgNy4wNjIyOSAxNi4zODU4IDYuNjg1NjYgMTYuMTY3NkM2LjMwOTA0IDE1Ljk0OTUgNS45ODUzMSAxNS42ODMzIDUuNzE0NDcgMTUuMzY5MUM1LjQ0MzY0IDE1LjA1NSA1LjIyMzU5IDE0LjY5MDYgNS4wNTQzMiAxNC4yNzYxQzQuODg1MDQgMTMuODYxNiA0LjgwNDY0IDEzLjM4NiA0LjgxMzEgMTIuODQ5M0M0LjgxMzEgMTIuNjI2OCA0Ljg1NzU0IDEyLjQxNzMgNC45NDY0MSAxMi4yMjFDNS4wMzUyNyAxMi4wMjQ2IDUuMTUzNzYgMTEuODUwMSA1LjMwMTg3IDExLjY5NzRDNS40NDk5OSAxMS41NDQ3IDUuNjIzNDkgMTEuNDI5IDUuODIyMzggMTEuMzUwNUM2LjAyMTI4IDExLjI3MTkgNi4yMjg2MyAxMS4yMjgzIDYuNDQ0NDUgMTEuMjE5NkgxNC41OTQ4Wk0xNS4zNzU2IDEyLjg5NTFDMTUuMzc1NiAxMi43ODE3IDE1LjM1NDQgMTIuNjc0OCAxNS4zMTIxIDEyLjU3NDRDMTUuMjY5OCAxMi40NzQgMTUuMjEyNyAxMi4zODQ2IDE1LjE0MDcgMTIuMzA2MUMxNS4wNjg4IDEyLjIyNzUgMTQuOTgyIDEyLjE2NjQgMTQuODgwNSAxMi4xMjI4QzE0Ljc3ODkgMTIuMDc5MiAxNC42NzMxIDEyLjA1NzMgMTQuNTYzMSAxMi4wNTczSDYuNDQ0NDVDNi4zMzAxOSAxMi4wNTczIDYuMjI0NCAxMi4wNzkyIDYuMTI3MDcgMTIuMTIyOEM2LjAyOTc0IDEyLjE2NjQgNS45NDI5OSAxMi4yMjUzIDUuODY2ODIgMTIuMjk5NUM1Ljc5MDY0IDEyLjM3MzcgNS43MzE0IDEyLjQ2MSA1LjY4OTA4IDEyLjU2MTNDNS42NDY3NiAxMi42NjE3IDUuNjI1NiAxMi43NzI5IDUuNjI1NiAxMi44OTUxQzUuNjI1NiAxMy4zMzE0IDUuNjk3NTQgMTMuNzE3NiA1Ljg0MTQyIDE0LjA1MzZDNS45ODUzMSAxNC4zODk2IDYuMTgyMDggMTQuNjgxOSA2LjQzMTc2IDE0LjkzMDZDNi42ODE0MyAxNS4xNzkzIDYuOTY5MTkgMTUuMzg2NiA3LjI5NTA0IDE1LjU1MjRDNy42MjA4OCAxNS43MTgyIDcuOTYzNjYgMTUuODUzNSA4LjMyMzM2IDE1Ljk1ODJDOC42ODMwNiAxNi4wNjI5IDkuMDUxMjIgMTYuMTM3MSA5LjQyNzg1IDE2LjE4MDdDOS44MDQ0OCAxNi4yMjQ0IDEwLjE2MjEgMTYuMjQ2MiAxMC41MDA2IDE2LjI0NjJDMTAuODQzNCAxNi4yNDYyIDExLjIwMSAxNi4yMjQ0IDExLjU3MzQgMTYuMTgwN0MxMS45NDU4IDE2LjEzNzEgMTIuMzExOCAxNi4wNjUxIDEyLjY3MTUgMTUuOTY0N0MxMy4wMzEyIDE1Ljg2NDQgMTMuMzc2MSAxNS43MjkxIDEzLjcwNjIgMTUuNTU4OUMxNC4wMzYyIDE1LjM4ODggMTQuMzIxOSAxNS4xNzkzIDE0LjU2MzEgMTQuOTMwNkMxNC44MDQzIDE0LjY4MTkgMTUuMDAxMSAxNC4zODk2IDE1LjE1MzQgMTQuMDUzNkMxNS4zMDU4IDEzLjcxNzYgMTUuMzc5OCAxMy4zMzE0IDE1LjM3NTYgMTIuODk1MVoiIGZpbGw9IiNFRUVGRkYiLz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMF8xMDg4XzQ5NDAwIj4KPHJlY3QgeD0iNCIgeT0iMy42Nzk2OSIgd2lkdGg9IjEzIiBoZWlnaHQ9IjEzLjQwNDMiIHJ4PSI0IiBmaWxsPSJ3aGl0ZSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=',
    brandColor: '#268bde',
    description: 'Easily integrate cutting-edge artificial intelligence capabilities into your workflows',
    capabilities: ['actions'],
    operationParameterSets: {
      agentModelType: {
        name: 'agentModelType',
        uiDefinition: {
          displayName: 'Agent model type',
          description: 'Type of agent model to use',
          constraints: {
            required: 'true',
            notSupportedConnectionParameters: {
              FoundryAgentService: ['Key'],
            },
          },
        },
      },
    },
    connectionParameterSets: {
      uiDefinition: {
        displayName: 'Authentication type',
        description: 'Type of authentication to use',
      },
      values: [
        {
          name: 'Key',
          parameters: {
            cognitiveServiceAccountId: {
              type: 'string',
              uiDefinition: {
                displayName: 'Azure Cognitive Service Account',
                description: 'Select the Azure Cognitive Service Account to use for this connection',
                tooltip: 'Select the Azure Cognitive Service Account to use for this connection',
                constraints: {
                  clearText: true,
                  required: 'true',
                },
              },
            },
            openAIEndpoint: {
              type: 'string',
              parameterSource: 'AppConfiguration',
              uiDefinition: {
                displayName: 'API endpoint',
                description: 'Endpoint will be filled automatically.',
                tooltip: 'The endpoint of the resource that hosts the AI model',
                constraints: {
                  clearText: true,
                  required: 'true',
                },
              },
            },
            openAIKey: {
              type: 'securestring',
              parameterSource: 'AppConfiguration',
              uiDefinition: {
                displayName: 'API key',
                description: 'Key will be filled automatically.',
                tooltip: 'The API key to access the resource that hosts the AI model',
                constraints: {
                  clearText: false,
                  required: 'true',
                },
              },
            },
          },
          uiDefinition: {
            displayName: 'URL and key-based authentication',
            tooltip: 'URL and key-based authentication',
            description: 'URL and key-based authentication',
          },
        },
        {
          name: 'ManagedServiceIdentity',
          parameters: {
            cognitiveServiceAccountId: {
              type: 'string',
              managedIdentitySettings: {
                requiredRoles: ['Azure AI Administrator', 'Cognitive Services Contributor'],
              },
              uiDefinition: {
                displayName: 'Azure Cognitive Service Account',
                description: 'Select the Azure Cognitive Service Account to use for this connection',
                tooltip: 'Select the Azure Cognitive Service Account to use for this connection',
                constraints: {
                  clearText: true,
                  required: 'true',
                },
              },
            },
            openAIEndpoint: {
              type: 'string',
              parameterSource: 'AppConfiguration',
              uiDefinition: {
                displayName: 'API endpoint',
                description: 'Endpoint will be filled automatically.',
                tooltip: 'The endpoint of the resource that hosts the AI model',
                constraints: {
                  clearText: true,
                  required: 'true',
                },
              },
            },
          },
          uiDefinition: {
            displayName: 'Managed Service Identity',
            tooltip: 'Managed Service Identity',
            description: 'Managed Service Identity',
          },
        },
      ],
    },
  },
} as Connector;
