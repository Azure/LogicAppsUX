import { coreBadge } from '../../badges';

const iconUri =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHdpZHRoPSIxMTVweCIgaGVpZ2h0PSIxMTVweCIgdmlld0JveD0iMCAwIDExNSAxMTUiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDExNSAxMTUiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHJlY3QgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiMwMDcyYzYiIHdpZHRoPSIxMTUiIGhlaWdodD0iMTE1Ii8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSI0OSwyNy4wMDkgNDMuMDIsMjEgNDIsMjEgNDIsMjggNDksMjggIi8+DQo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgZD0iTTgyLDI5di04SDY2djE1SDQ5di02aC04bC0xLTF2LThIMjR2MjloMTF2MTVIMjR2MjloMjVWODNoMTd2MTENCgloMjVWNzRoLThsLTEtMXYtOGgtMlY1MGgxMVYzMGgtOEw4MiwyOXogTTc3LDY1SDY2djE1SDQ5di02aC04bC0xLTF2LThoLTJWNTBoMTFWMzloMTd2MTFoMTFWNjV6Ii8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSI4NS4wMiwyMSA4NCwyMSA4NCwyOCA5MSwyOCA5MSwyNy4wMDkgIi8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSI4NCw2NSA4NCw3MiA5MSw3MiA5MSw3MS4wMDkgODUuMDIsNjUgIi8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSI0Miw2NSA0Miw3MiA0OSw3MiA0OSw3MS4wMDkgNDMuMDIsNjUgIi8+DQo8L3N2Zz4NCg==';

const brandColor = '#0078D7';

const api = {
  id: 'builtin/as2',
  name: 'as2',
  displayName: 'AS2 (v2)',
  description: 'AS2 (v2)',
  iconUri,
  brandColor,
};

export const as2Group = {
  id: api.id,
  name: api.name,
  properties: {
    displayName: api.displayName,
    description: api.description,
    iconUri,
    brandColor,
    capabilities: ['actions'],
  },
};

export const as2EncodeOperation = {
  id: 'as2encode',
  name: 'as2encode',
  type: 'builtin',
  properties: {
    api,
    summary: 'AS2 Encode',
    description:
      'To establish security and reliability while transmitting messages, use the AS2 encode messaging. This also provides digital signing, encryption, and acknowledgements through Message Disposition Notifications (MDN), which also leads to support for Non-Repudiation.',
    environmentBadge: coreBadge,
    operationType: 'AS2Encode',
    visibility: 'Important',
    brandColor,
    iconUri,
  },
};

export const as2DecodeOperation = {
  id: 'as2decode',
  name: 'as2decode',
  type: 'builtin',
  properties: {
    api,
    summary: 'AS2 Decode',
    description:
      'To establish security and reliability while transmitting messages, use the AS2 encode messaging. This also provides digital signing, encryption, and acknowledgements through Message Disposition Notifications (MDN), which also leads to support for Non-Repudiation.',
    environmentBadge: coreBadge,
    operationType: 'AS2Decode',
    visibility: 'Important',
    brandColor,
    iconUri,
  },
};
