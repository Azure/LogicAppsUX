import { coreBadge } from '../../badges';

const iconUri =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHdpZHRoPSI0OHB4IiBoZWlnaHQ9IjQ4cHgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDggNDgiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHJlY3QgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiM4MDQ5OTgiIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIvPg0KPHBvbHlnb24gZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiNGRkZGRkYiIHBvaW50cz0iMjAsMTAuNjk0IDE3LjM2OSw4IDE3LDggMTcsMTEgMjAsMTEgIi8+DQo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgZD0iTTM1LDExLjYwOVY4aC03djZoLTh2LTJoLTMuNjc0TDE2LDExLjYwOVY4SDl2MTNoNHY2SDl2MTNoMTF2LTVoOA0KCXY1aDExdi05aC0zLjY3NEwzNSwzMC43MzlWMjdoLTF2LTZoNXYtOWgtMy42NzRMMzUsMTEuNjA5eiBNMzIsMjdoLTR2NmgtOHYtMmgtMy42NzRMMTYsMzAuNzM5VjI3aC0xdi02aDV2LTVoOHY1aDRWMjd6Ii8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSIzNi4zNjksOCAzNiw4IDM2LDExIDM5LDExIDM5LDEwLjY5NCAiLz4NCjxwb2x5Z29uIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjM2LDI3IDM2LDMwIDM5LDMwIDM5LDI5LjY5NCAzNi4zNjksMjcgIi8+DQo8cG9seWdvbiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI0ZGRkZGRiIgcG9pbnRzPSIxNywyNyAxNywzMCAyMCwzMCAyMCwyOS42OTQgMTcuMzY5LDI3ICIvPg0KPC9zdmc+DQo=';

const brandColor = '#804998';

const api = {
  id: 'builtin/rosettanet',
  name: 'rosettanet',
  displayName: 'RosettaNet',
  description: 'RosettaNet',
  iconUri,
  brandColor,
};

export const rosettaNetGroup = {
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

export const rosettaNetEncodeOperation = {
  id: 'rosettanetencode',
  name: 'rosettanetencode',
  type: 'builtin',
  properties: {
    api,
    summary: 'RosettaNet Encode',
    description: 'To encode RosettaNet message.',
    environmentBadge: coreBadge,
    operationType: 'AS2Encode',
    visibility: 'Important',
    brandColor,
    iconUri,
  },
};

export const rosettaNetDecodeOperation = {
  id: 'rosettanetdecode',
  name: 'rosettanetdecode',
  type: 'builtin',
  properties: {
    api,
    summary: 'RosettaNet Decode',
    description: 'To decode RosettaNet message.',
    environmentBadge: coreBadge,
    operationType: 'AS2Decode',
    visibility: 'Important',
    brandColor,
    iconUri,
  },
};

export const rosettaNetWairForResponseOperation = {
  id: 'rosettanetwaitforresponse',
  name: 'rosettanetwaitforresponse',
  type: 'builtin',
  properties: {
    api,
    summary: 'RosettaNet wait for response',
    description: 'To wait for RosettaNet response or signal message.',
    environmentBadge: coreBadge,
    operationType: 'RosettaNetWaitForResponse',
    visibility: 'Important',
    brandColor,
    iconUri,
  },
};
