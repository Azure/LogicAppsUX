import { coreBadge, previewBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/logic-apps-shared';

const iconUri =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHdpZHRoPSIxMTVweCIgaGVpZ2h0PSIxMTVweCIgdmlld0JveD0iMCAwIDExNSAxMTUiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDExNSAxMTUiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHJlY3QgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiMwMDcyYzYiIHdpZHRoPSIxMTUiIGhlaWdodD0iMTE1Ii8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSI0OSwyNy4wMDkgNDMuMDIsMjEgNDIsMjEgNDIsMjggNDksMjggIi8+DQo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgZD0iTTgyLDI5di04SDY2djE1SDQ5di02aC04bC0xLTF2LThIMjR2MjloMTF2MTVIMjR2MjloMjVWODNoMTd2MTENCgloMjVWNzRoLThsLTEtMXYtOGgtMlY1MGgxMVYzMGgtOEw4MiwyOXogTTc3LDY1SDY2djE1SDQ5di02aC04bC0xLTF2LThoLTJWNTBoMTFWMzloMTd2MTFoMTFWNjV6Ii8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSI4NS4wMiwyMSA4NCwyMSA4NCwyOCA5MSwyOCA5MSwyNy4wMDkgIi8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSI4NCw2NSA4NCw3MiA5MSw3MiA5MSw3MS4wMDkgODUuMDIsNjUgIi8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSI0Miw2NSA0Miw3MiA0OSw3MiA0OSw3MS4wMDkgNDMuMDIsNjUgIi8+DQo8L3N2Zz4NCg==';
const brandColor = '#0078D7';

const connector = {
  id: 'builtin/as2',
  name: 'as2',
  properties: {
    displayName: 'AS2 (v2)',
    iconUri,
    brandColor,
    description: 'AS2 (v2)',
  },
};

export const as2EncodeManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'AS2 Encode',
    description:
      'To establish security and reliability while transmitting messages, use the AS2 encode messaging. This also provides digital signing, encryption, and acknowledgements through Message Disposition Notifications (MDN), which also leads to support for Non-Repudiation.',

    statusBadge: previewBadge,
    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['messageToEncode', 'as2From', 'as2To'],
      properties: {
        messageToEncode: {
          title: 'Message to encode',
          description: 'Enter the message to AS2 encode',
        },
        as2From: {
          type: 'string',
          title: 'AS2 from',
          description: 'Enter the AS2 from',
        },
        as2To: {
          type: 'string',
          title: 'AS2 to',
          description: 'Enter the AS2 to',
        },
        contentType: {
          type: 'string',
          title: 'Content type',
          description: 'Enter the message content type',
        },
        fileName: {
          type: 'string',
          title: 'File name',
          description: 'Enter the file name',
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
            'messageHeaders',
            'messageId',
            'agreementName',
            'senderPartnerName',
            'receiverPartnerName',
            'isMessageCompressed',
            'isMessageEncrypted',
            'isMessageSigned',
            'isMdnExpected',
            'mdnType',
          ],
          properties: {
            messageContent: {
              title: 'Encoded message content',
              description: 'The AS2 encoded message content.',
            },
            messageHeaders: {
              type: 'object',
              title: 'Encoded message headers',
              description: 'The AS2 encoded message headers.',
              additionalProperties: {
                type: 'string',
              },
              'x-ms-editor': 'dictionary',
            },
            messageId: {
              type: 'string',
              title: 'Message id',
              description: 'The AS2 message id.',
            },
            agreementName: {
              type: 'string',
              title: 'Agreement name',
              description: 'The AS2 agreement name.',
            },
            senderPartnerName: {
              type: 'string',
              title: 'Sender partner name',
              description: 'The AS2 sender partner name.',
            },
            receiverPartnerName: {
              type: 'string',
              title: 'Receiver partner name',
              description: 'The AS2 receiver partner name.',
            },
            micHash: {
              type: 'string',
              title: 'MIC hash',
              description: 'The MIC(Message Integrity Check) hash.',
            },
            fileName: {
              type: 'string',
              title: 'File name',
              description: 'The MIME file name.',
            },
            isMessageCompressed: {
              type: 'boolean',
              title: 'Is message compressed',
              description: 'The value indicating whether the message is compressed or not.',
            },
            isMessageEncrypted: {
              type: 'boolean',
              title: 'Is message encrypted',
              description: 'The value indicating whether the message is encrypted or not.',
            },
            isMessageSigned: {
              type: 'boolean',
              title: 'Is message signed',
              description: 'The value indicating whether the message is signed or not.',
            },
            isMdnExpected: {
              type: 'boolean',
              title: 'Is MDN expected',
              description: 'The value indicating whether the MDN(acknowledgment) is expected or not.',
            },
            mdnType: {
              type: 'string',
              title: 'MDN type',
              description: 'The MDN(acknowledgment) type - NotConfigured, Sync, Async.',
            },
            receiverUri: {
              type: 'string',
              title: 'Receiver URI',
              description: 'The receiver URI.',
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

export const as2DecodeManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'AS2 Decode',
    description:
      'To establish security and reliability while transmitting messages, use the AS2 encode messaging. This also provides digital signing, encryption, and acknowledgements through Message Disposition Notifications (MDN), which also leads to support for Non-Repudiation.',

    statusBadge: previewBadge,
    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['messageToDecode', 'messageHeaders'],
      properties: {
        messageToDecode: {
          title: 'Message to decode',
          description: 'Enter the AS2 message to decode',
        },
        messageHeaders: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
          title: 'Message headers',
          description: 'Enter the AS2 message headers',
          'x-ms-editor': 'dictionary',
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
            'messageHeaders',
            'messageId',
            'agreementName',
            'senderPartnerName',
            'receiverPartnerName',
            'isMessageCompressed',
            'isMessageEncrypted',
            'isMessageSigned',
            'messageProcessingStatus',
            'messageType',
            'isMdnExpected',
            'mdnType',
          ],
          properties: {
            messageContent: {
              title: 'Decoded message content',
              description: 'The AS2 decoded message content.',
            },
            messageHeaders: {
              type: 'object',
              additionalProperties: {
                type: 'string',
              },
              title: 'Decoded message headers',
              description: 'The AS2 decoded message headers.',
              'x-ms-editor': 'dictionary',
            },
            messageId: {
              type: 'string',
              title: 'Message Id',
              description: 'The AS2 message Id.',
            },
            agreementName: {
              type: 'string',
              title: 'Agreement name',
              description: 'The AS2 agreement name.',
            },
            senderPartnerName: {
              type: 'string',
              title: 'Sender partner name',
              description: 'The AS2 sender partner name.',
            },
            receiverPartnerName: {
              type: 'string',
              title: 'Receiver partner name',
              description: 'The AS2 receiver partner name.',
            },
            fileName: {
              type: 'string',
              title: 'File name',
              description: 'The MIME file name.',
            },
            isMessageCompressed: {
              type: 'boolean',
              title: 'Is message compressed',
              description: 'The value indicating whether the message is compressed or not.',
            },
            isMessageEncrypted: {
              type: 'boolean',
              title: 'Is message encrypted',
              description: 'The value indicating whether the message is encrypted or not.',
            },
            isMessageSigned: {
              type: 'boolean',
              title: 'Is message signed',
              description: 'The value indicating whether the message is signed or not.',
            },
            isDuplicateMessage: {
              type: 'boolean',
              title: 'Is duplicate message',
              description: 'The value indicating whether the message is duplicate or not.',
            },
            messageProcessingStatus: {
              type: 'string',
              title: 'Message processing status',
              description: 'The message processing status - Succeeded, Failed.',
            },
            micHash: {
              type: 'string',
              title: 'MIC hash',
              description: 'The MIC(Message Integrity Check) hash.',
            },
            messageType: {
              type: 'string',
              title: 'Message type',
              description: 'The message type - Interchange or MDN(acknowledgment).',
            },
            isMdnExpected: {
              type: 'boolean',
              title: 'Is MDN expected',
              description: 'The value indicating whether the MDN(acknowledgment) is expected or not.',
            },
            mdnType: {
              type: 'string',
              title: 'MDN type',
              description: 'The MDN(acknowledgment) type - NotConfigured, Sync, Async.',
            },
            micVerificationStatus: {
              type: 'string',
              title: 'MIC verification status',
              description: 'The MIC verification status.',
            },
            isMdnSigned: {
              type: 'boolean',
              title: 'Is MDN signed',
              description: 'The value indicating whether the MDN(acknowledgment) is signed or not.',
            },
            originalMessageId: {
              type: 'string',
              title: 'Original message Id',
              description: 'The AS2 original message Id from MDN(acknowledgment).',
            },
            originalMessageMicHashFromMdn: {
              type: 'string',
              title: 'Original message MIC hash',
              description: 'The AS2 original message MIC hash from MDN(acknowledgment).',
            },
            mdnDispositionMode: {
              type: 'string',
              title: 'MDN disposition mode',
              description: 'The AS2 MDN(acknowledgment) disposition mode.',
            },
            mdnDispositionType: {
              type: 'string',
              title: 'MDN disposition type',
              description: 'The AS2 MDN(acknowledgment) disposition type.',
            },
            mdnFinalRecipient: {
              type: 'string',
              title: 'MDN final recipient',
              description: 'The AS2 MDN(acknowledgment) final recipient.',
            },
            mdnStatusCode: {
              type: 'string',
              title: 'MDN status code',
              description: 'The AS2 MDN(acknowledgment) status code.',
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
                        description: 'The AS2 decode message error code.',
                      },
                      message: {
                        type: 'string',
                        title: 'message',
                        description: 'The AS2 decode message error message.',
                      },
                    },
                  },
                },
              },
            },
            outgoingMdnContent: {
              title: 'Outgoing MDN content',
              description: 'The outgoing AS2 MDN(acknowledgment) content.',
            },
            outgoingMdnHeaders: {
              type: 'object',
              title: 'Outgoing MDN headers',
              description: 'The outgoing AS2 MDN(acknowledgment) headers.',
              'x-ms-editor': 'dictionary',
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
