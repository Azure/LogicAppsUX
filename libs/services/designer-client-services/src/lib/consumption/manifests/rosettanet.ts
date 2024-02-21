import { coreBadge, previewBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/logic-apps-shared';

const iconUri =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHdpZHRoPSI0OHB4IiBoZWlnaHQ9IjQ4cHgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDggNDgiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHJlY3QgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiM4MDQ5OTgiIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIvPg0KPHBvbHlnb24gZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiNGRkZGRkYiIHBvaW50cz0iMjAsMTAuNjk0IDE3LjM2OSw4IDE3LDggMTcsMTEgMjAsMTEgIi8+DQo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgZD0iTTM1LDExLjYwOVY4aC03djZoLTh2LTJoLTMuNjc0TDE2LDExLjYwOVY4SDl2MTNoNHY2SDl2MTNoMTF2LTVoOA0KCXY1aDExdi05aC0zLjY3NEwzNSwzMC43MzlWMjdoLTF2LTZoNXYtOWgtMy42NzRMMzUsMTEuNjA5eiBNMzIsMjdoLTR2NmgtOHYtMmgtMy42NzRMMTYsMzAuNzM5VjI3aC0xdi02aDV2LTVoOHY1aDRWMjd6Ii8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSIzNi4zNjksOCAzNiw4IDM2LDExIDM5LDExIDM5LDEwLjY5NCAiLz4NCjxwb2x5Z29uIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjM2LDI3IDM2LDMwIDM5LDMwIDM5LDI5LjY5NCAzNi4zNjksMjcgIi8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSIxNywyNyAxNywzMCAyMCwzMCAyMCwyOS42OTQgMTcuMzY5LDI3ICIvPg0KPC9zdmc+DQo=';
const brandColor = '#804998';

const connector = {
  id: 'builtin/rosettanet',
  name: 'rosettanet',
  properties: {
    displayName: 'RosettaNet',
    description: 'RosettaNet',
    iconUri,
    brandColor,
  },
};

export const rosettaNetEncodeManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'RosettaNet Encode',
    description: 'To encode RosettaNet message.',

    statusBadge: previewBadge,
    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: [
        'messageToEncode',
        'guestPartnerName',
        'hostPartnerName',
        'processConfigurationCode',
        'processConfigurationVersion',
        'processConfigurationInstanceIdentity',
        'messageType',
        'homeRole',
      ],
      properties: {
        messageToEncode: {
          title: 'RosettaNet process (PIP) instance identity.',
          description: 'Message to encode.',
        },
        hostPartnerName: {
          type: 'string',
          title: 'Host partner',
          description: 'Host partner name.',
        },
        guestPartnerName: {
          type: 'string',
          title: 'Guest partner',
          description: 'Guest partner name.',
        },
        processConfigurationCode: {
          type: 'string',
          title: 'PIP code',
          description: 'Partner interface process (PIP) code.',
        },
        processConfigurationVersion: {
          type: 'string',
          title: 'PIP version',
          description: 'Partner Interface Processes (PIP) version.',
        },
        processConfigurationInstanceIdentity: {
          type: 'string',
          title: 'PIP instance identity',
          description: 'Partner Interface Processes (PIP) instance identity.',
        },
        messageType: {
          type: 'string',
          title: 'Message type',
          description: 'Choose the message type.',
          enum: ['Action', 'Response', 'Signal'],
          default: 'Action',
          'x-ms-editor-options': {
            items: [
              {
                title: 'Action',
                value: 'Action',
              },
              {
                title: 'Response',
                value: 'Response',
              },
              {
                title: 'Signal',
                value: 'Signal',
              },
            ],
          },
        },
        trackingId: {
          type: 'string',
          title: 'Tracking id',
          description: 'The RosettaNet generated tracking id.',
        },
        homeRole: {
          type: 'string',
          title: 'Role',
          description: 'Role of the host organization in this transaction.',
          enum: ['Initiator', 'Responder'],
          default: 'Initiator',
          'x-ms-editor-options': {
            items: [
              {
                title: 'Initiator',
                value: 'Initiator',
              },
              {
                title: 'Responder',
                value: 'Responder',
              },
            ],
          },
        },
        attachments: {
          type: 'array',
          title: 'Attachments',
          description: 'The RosettaNet attachments.',
          items: {
            type: 'object',
            required: ['content', 'fileName'],
            title: 'Attachment',
            description: 'The RosettaNet attachment.',
            properties: {
              content: {
                type: 'string',
                title: 'content',
                description: 'The content of attachment.',
              },
              fileName: {
                type: 'string',
                title: 'file name',
                description: 'The file name of attachment',
              },
            },
          },
        },
      },
    },
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          required: ['messageContent', 'messageHeaders', 'trackingid'],
          properties: {
            messageContent: {
              title: 'Message content',
              description: 'The RosettaNet message content.',
            },
            messageHeaders: {
              type: 'object',
              title: 'Message header',
              description: 'The RosettaNet message headers.',
              additionalProperties: {
                type: 'string',
              },
              'x-ms-editor': 'dictionary',
            },
            trackingid: {
              type: 'string',
              title: 'Tracking id',
              description: 'The RosettaNet generated tracking id.',
            },
            responseType: {
              type: 'string',
              title: 'Response type',
              description: 'The RosettaNet response type - sync or async.',
            },
            actionType: {
              type: 'string',
              title: 'Action type',
              description: 'The RosettaNet action type - single or double.',
            },
            outboundUri: {
              type: 'string',
              title: 'Outbound URI',
              description: 'The RosettaNet outbound URI.',
            },
            messageHash: {
              type: 'string',
              title: 'Message hash',
              description: 'The RosettaNet message digest value.',
            },
          },
        },
      },
    },
    isOutputsOptional: false,

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: ['action'],
      },
    },

    connector,
  },
} as OperationManifest;

export const rosettaNetDecodeManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'RosettaNet Decode',
    description: 'To decode RosettaNet message.',

    statusBadge: previewBadge,
    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['messageToDecode', 'messageHeaders', 'homeRole'],
      properties: {
        messageToDecode: {
          title: 'Message',
          description: 'Message to decode.',
        },
        messageHeaders: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
          title: 'Headers',
          description: 'Specify the HTTP headers.',
          'x-ms-editor': 'dictionary',
        },
        homeRole: {
          type: 'string',
          title: 'Role',
          description: 'Choose the home role.',
          enum: ['Initiator', 'Responder'],
          default: 'Initiator',
          'x-ms-editor-options': {
            items: [
              {
                title: 'Initiator',
                value: 'Initiator',
              },
              {
                title: 'Responder',
                value: 'Responder',
              },
            ],
          },
        },
      },
    },
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          required: [
            'messageContent',
            'hostPartnerName',
            'guestPartnerName',
            'processConfigurationInstanceIdentity',
            'processConfigurationCode',
            'processConfigurationVersion',
            'actionType',
            'responseType',
            'trackingId',
          ],
          properties: {
            messageContent: {
              title: 'Message content',
              description: 'The RosettaNet decoded message content.',
            },
            hostPartnerName: {
              type: 'string',
              title: 'Host partner',
              description: 'The RosettaNet host partner name.',
            },
            guestPartnerName: {
              type: 'string',
              title: 'Guest partner',
              description: 'The RosettaNet guest partner name.',
            },
            processConfigurationCode: {
              type: 'string',
              title: 'Process Code',
              description: 'RosettaNet process (PIP) code.',
            },
            processConfigurationInstanceIdentity: {
              type: 'string',
              title: 'PIP instance id',
              description: 'RosettaNet process (PIP) instance identity.',
            },
            processConfigurationVersion: {
              type: 'string',
              title: 'Process version',
              description: 'RosettaNet process (PIP) Version.',
            },
            actionType: {
              type: 'string',
              title: 'Action type',
              description: 'RosettaNet message action type, single or double.',
            },
            responseType: {
              type: 'string',
              title: 'Response type',
              description: 'RosettaNet Response type - sync or async.',
            },
            trackingId: {
              type: 'string',
              title: 'Incoming tracking id',
              description: 'RosettaNet delivery header tracking id.',
            },
            outboundSignal: {
              type: 'string',
              title: 'Outbound signal',
              description: 'Generated outbound signal.',
            },
            maxRetryCount: {
              type: 'integer',
              title: 'Maximum retry count',
              description: 'The RosettaNet maximum retry count.',
            },
            micDigest: {
              type: 'string',
              title: 'MIC digest',
              description: 'The mic (message integrity checker) digest value.',
            },
            messageType: {
              type: 'string',
              title: 'Message type ',
              description: 'The message type.',
            },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                required: ['content', 'contentType', 'contentId'],
                title: 'Attachment',
                description: 'The RosettaNet attachment.',
                properties: {
                  content: {
                    type: 'string',
                    title: 'content',
                    description: 'The content of attachment.',
                  },
                  contentType: {
                    type: 'string',
                    title: 'content type',
                    description: 'The content type of attachment.',
                  },
                  fileName: {
                    type: 'string',
                    title: 'file name',
                    description: 'The file name of attachment',
                  },
                  contentId: {
                    type: 'string',
                    title: 'content id',
                    description: 'The content id.',
                  },
                },
              },
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                required: ['error'],
                properties: {
                  error: {
                    type: 'object',
                    title: 'Error',
                    description: 'Error details.',
                    properties: {
                      code: {
                        type: 'string',
                        title: 'code',
                        description: 'The RosettaNet decode message error code.',
                      },
                      message: {
                        type: 'string',
                        title: 'message',
                        description: 'The RosettaNet decode message error message.',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    isOutputsOptional: false,

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: ['action'],
      },
    },

    connector,
  },
} as OperationManifest;

export const rosettaNetWaitForResponseManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'RosettaNet RosettaNet wait for response',
    description: 'To wait for RosettaNet response or signal message.',

    statusBadge: previewBadge,
    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['serviceContent', 'processInstanceIdentity', 'homeRole', 'retryCount'],
      properties: {
        serviceContent: {
          title: 'Body',
          description: 'Enter the original message.',
        },
        processInstanceIdentity: {
          type: 'string',
          title: 'PIP instance identity',
          description: 'Partner Interface Processes (PIP) instance identity.',
        },
        retryCount: {
          type: 'integer',
          title: 'Retry count',
          description: 'Enter the retry count.',
        },
        homeRole: {
          type: 'string',
          title: 'Role',
          description: 'Choose the home role.',
          enum: ['Initiator', 'Responder'],
          default: 'Initiator',
          'x-ms-editor-options': {
            items: [
              {
                title: 'Initiator',
                value: 'Initiator',
              },
              {
                title: 'Responder',
                value: 'Responder',
              },
            ],
          },
        },
        pollingInterval: {
          type: 'object',
          title: 'Polling interval',
          description: 'Enter the polling interval.',
          properties: {
            count: {
              title: 'Count',
              description: 'Enter the polling interval count.',
              type: 'integer',
            },
            unit: {
              title: 'Unit',
              description: 'Enter the polling interval unit.',
              type: 'string',
              enum: ['Day', 'Hour', 'Minute', 'Second'],
              'x-ms-editor-options': {
                items: [
                  {
                    title: 'Day',
                    value: 'Day',
                  },
                  {
                    title: 'Hour',
                    value: 'Hour',
                  },
                  {
                    title: 'Minute',
                    value: 'Minute',
                  },
                  {
                    title: 'Second',
                    value: 'Second',
                  },
                ],
              },
            },
          },
        },
      },
    },
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          required: ['notificationOfFailureMessage', 'waitResult'],
          properties: {
            notificationOfFailureMessage: {
              title: 'Notification of failure',
              description: 'Notification of failure message.',
            },
            waitResult: {
              type: 'string',
              title: 'Wait for response result',
              description: 'Wait for response result.',
            },
          },
        },
      },
    },
    isOutputsOptional: false,

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: ['action'],
      },
    },

    connector,
  },
} as OperationManifest;
