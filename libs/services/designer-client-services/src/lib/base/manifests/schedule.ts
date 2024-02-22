import { coreBadge } from '../../badges';
import { getIntl } from '@microsoft/logic-apps-shared';
import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { getFrequencyValues, RecurrenceType, SettingScope } from '@microsoft/logic-apps-shared';

export const frequencyValues = getFrequencyValues(getIntl());

const scheduleIcon =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzFGODVGRiIvPg0KIDxnIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBkPSJNMTYuMDE1IDEwLjEzOGMtMy44NC0uMDA3LTYuOTUzIDMuMTA2LTYuOTQ2IDYuOTMxLjAwNyAzLjgzMyAzLjEwNiA2LjkzMSA2LjkyNCA2LjkzMSAzLjgxOCAwIDYuOTMxLTMuMTA2IDYuOTM4LTYuOTI0LjAwNy0zLjgxMS0zLjEwNi02LjkzOC02LjkxNy02LjkzOHptLS4wMjkgMTIuMzI4Yy0zLjA3Ni0uMDE1LTUuMzk2LTIuNDk1LTUuMzgyLTUuNDE4LjAxNS0zLjA5OCAyLjU5Ni01LjQ2MiA1LjYwNy01LjM3NSAyLjgxNS4wODcgNS4yMDcgMi41MzEgNS4xNzggNS4zOTYtLjAwNyAyLjk4OS0yLjM5MyA1LjQxMS01LjQwNCA1LjM5NnoiLz4NCiAgPHBhdGggZD0iTTIxLjk0OSAxMi4xMzhjLjEzOC0uMzQ5LjI2Mi0uNjkxLjQxNS0xLjAxOC4yNC0uNTAyLjEwOS0uOTM4LS4yNjItMS4yODctLjg4LS44MzYtMS45MTMtMS40MzMtMy4wODQtMS43NjctLjM2NC0uMTAyLS43NjQtLjExNi0xLjA0LjE5Ni0uMzEzLjM0OS0uNTc1Ljc0OS0uODczIDEuMTQ5IDEuOTQyLjM1NiAzLjUyNyAxLjI4IDQuODQ0IDIuNzI3eiIvPg0KICA8cGF0aCBkPSJNMTAuMDI5IDEyLjExNmMxLjMwOS0xLjQ2MiAyLjg5NS0yLjM2NCA0LjgxNS0yLjcyNy0uMjMzLS4zMjctLjQ1OC0uNjE4LS42NTUtLjkxNi0uMjY5LS40MjItLjY1NS0uNTMxLTEuMTEzLS40NDQtMS4wNC4yMDQtMS45MTMuNzU2LTIuNzU2IDEuMzY3LS4xODIuMTMxLS4zNDkuMjk4LS41MDIuNDY1LS4yNjIuMjg0LS40MDcuNjE4LS4yOTEuOTk2LjEzOC40MTUuMzI3LjgyMi41MDIgMS4yNTh6Ii8+DQogIDxwYXRoIGQ9Ik0xNi41MTYgMTIuOTIzYy0uNjA0LS4zMjctMS4yNjUuMDUxLTEuMjY1LjczNS4wMDcuOTY3LjAxNSAxLjkzNS4wMzYgMi45MDkuMDA3LjE4OS0uMDQ0LjMyNy0uMTk2LjQ1OC0uMzg1LjMyLS43NzEuNjQ3LTEuMTM1Ljk4OS0uMzEzLjI5MS0uMzA1LjczNS0uMDE1IDEuMDU1LjI4NC4zMTMuNzQyLjM2NCAxLjA1NS4wOTUuNTM4LS40NjUgMS4wNjktLjkzMSAxLjU4NS0xLjQxOC4xMDktLjEwMi4yMTEtLjI5MS4yMTEtLjQzNi4wMjItLjY3Ni4wMDctMS4zNi4wMDctMi4wMzZoLjAzNnYtMS43MzFjLjAwNy0uMjY5LS4wNzMtLjQ4LS4zMi0uNjE4eiIvPg0KIDwvZz4NCjwvc3ZnPg0K';
const brandColor = '#1F85FF';

const scheduleConnector = {
  id: 'connectionProviders/schedule',
  name: 'schedule',
  properties: {
    description: 'Schedule operations',
    displayName: 'Schedule',
  },
} as any;

export const recurrenceManifest = {
  properties: {
    iconUri: scheduleIcon,
    brandColor,
    description: 'Triggers an event to run at regular, customized time intervals.',

    environmentBadge: coreBadge,

    recurrence: {
      type: RecurrenceType.Advanced,
      useLegacyParameterGroup: true,
    },

    connector: scheduleConnector,

    settings: {
      correlation: { scopes: [SettingScope.Trigger] },
      concurrency: { scopes: [SettingScope.Trigger] },
    },
  },
} as OperationManifest;

export const slidingWindowManifest = {
  properties: {
    iconUri: scheduleIcon,
    brandColor,
    description: 'Triggers a series of fixed-sized, non-overlapping, and contiguous time intervals from a specified start time.',

    environmentBadge: coreBadge,

    recurrence: {
      type: RecurrenceType.Basic,
    },

    inputs: {
      type: 'object',
      properties: {
        delay: {
          title: 'Delay',
          description: 'The amount to delay in ISO8601 format. eg. PT5M.',
          type: 'string',
        },
      },
    },
    isInputsOptional: true,

    outputs: {
      type: 'object',
      required: ['windowStartTime', 'windowEndTime'],
      properties: {
        windowStartTime: {
          title: 'Start time',
          description: 'The start time of the sliding window.',
          type: 'string',
          format: 'date-time',
        },
        windowEndTime: {
          title: 'End time',
          description: 'The end time of the sliding window.',
          type: 'string',
          format: 'date-time',
        },
      },
    },
    isOutputsOptional: false,

    connector: scheduleConnector,
  },
} as OperationManifest;

export const delayManifest = {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cGF0aCBkPSJtMCAwaDMydjMyaC0zMnoiIGZpbGw9IiMxZjg1ZmYiLz4NCiA8cGF0aCB0cmFuc2Zvcm09Im1hdHJpeCguNTcyIDAgMCAuNTcyIDYuODUzIDYuODU3KSIgZD0iTTI0LjQxIDguODRhMTMuODcgMTMuODcgMCAwIDEgMi44NCA0LjA3IDExLjY0IDExLjY0IDAgMCAxIDEgNC44NSAxMiAxMiAwIDAgMS0uNDQgMy4yNCAxMi4yOCAxMi4yOCAwIDAgMS04LjU1IDguNTUgMTIuMzcgMTIuMzcgMCAwIDEtNi41MiAwIDEyLjI4IDEyLjI4IDAgMCAxLTguNTUtOC41NSAxMi4zIDEyLjMgMCAwIDEtLjA4LTYuMjEgMTIuMzUgMTIuMzUgMCAwIDEgMS0yLjcxIDEyLjE5IDEyLjE5IDAgMCAxIDEuNjMtMi4zNSAxMi40MyAxMi40MyAwIDAgMSAyLjExLTEuOTMgMTIuMjEgMTIuMjEgMCAwIDEgNS40LTIuMTh2LTEuODdoLTMuNXYtMS43NWg4Ljc1djEuNzVoLTMuNXYxLjc1YTEyLjM0IDEyLjM0IDAgMCAxIDMuNy41NiAxMS42OCAxMS42OCAwIDAgMSAzLjMgMS42N2wyLjg0LTIuODQgMS4yMyAxLjIzem0tOC40MSAxOS40MWExMC4xNCAxMC4xNCAwIDAgMCA0LjA4LS44MyAxMC42MiAxMC42MiAwIDAgMCA1LjU5LTUuNTkgMTAuNDggMTAuNDggMCAwIDAgMC04LjE2IDEwLjYyIDEwLjYyIDAgMCAwLTUuNTktNS41OSAxMC40OCAxMC40OCAwIDAgMC04LjE2IDAgMTAuNjIgMTAuNjIgMCAwIDAtNS41OSA1LjU5IDEwLjQ4IDEwLjQ4IDAgMCAwIDAgOC4xNiAxMC42MiAxMC42MiAwIDAgMCA1LjU5IDUuNTkgMTAuMTQgMTAuMTQgMCAwIDAgNC4wOC44M3ptNS4yNS0xMC41djEuNzVoLTd2LTguNzVoMS43NXY3eiIgZmlsbD0iI2ZmZiIvPg0KPC9zdmc+DQo=',
    brandColor,
    description: 'Sets how long an action should be delayed once the flow is triggered.',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['interval'],
      properties: {
        interval: {
          type: 'object',
          required: ['count', 'unit'],
          properties: {
            count: {
              title: 'Count',
              description: 'Specify the count of unit to delay',
              type: 'integer',
            },
            unit: {
              title: 'Unit',
              description: 'Specify the unit to delay',
              type: 'string',
              'x-ms-editor': 'combobox',
              'x-ms-editor-options': {
                options: frequencyValues,
              },
              default: 'Minute',
            },
          },
        },
      },
    },
    isInputsOptional: false,

    connector: scheduleConnector,

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const delayUntilManifest = {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cGF0aCBkPSJtMCAwaDMydjMyaC0zMnoiIGZpbGw9IiMxZjg1ZmYiLz4NCiA8cGF0aCB0cmFuc2Zvcm09Im1hdHJpeCguNTcyIDAgMCAuNTcyIDYuODUzIDYuODU3KSIgZD0iTTI0LjQxIDguODRhMTMuODkgMTMuODkgMCAwIDEgMi44NCA0LjA3IDExLjY1IDExLjY1IDAgMCAxIDEgNC44NSAxMi4wOCAxMi4wOCAwIDAgMS0uNDQgMy4yNCAxMi4yOCAxMi4yOCAwIDAgMS04LjU1IDguNTUgMTIuMzcgMTIuMzcgMCAwIDEtNi41MiAwIDEyLjI4IDEyLjI4IDAgMCAxLTguNTUtOC41NSAxMi4zIDEyLjMgMCAwIDEtLjA4LTYuMjEgMTIuMzUgMTIuMzUgMCAwIDEgMS0yLjcxIDEyLjE5IDEyLjE5IDAgMCAxIDEuNjMtMi4zNSAxMi40IDEyLjQgMCAwIDEgMi4xMS0xLjkzIDEyLjIxIDEyLjIxIDAgMCAxIDUuNC0yLjE4di0xLjg3aC0zLjV2LTEuNzVoOC43NXYxLjc1aC0zLjV2MS43NWExMi4zNSAxMi4zNSAwIDAgMSAzLjcuNTYgMTEuNjggMTEuNjggMCAwIDEgMy4zIDEuNjdsMi44NC0yLjg0IDEuMjMgMS4yM3ptLTguNDEgMTkuNDFhMTAuMTQgMTAuMTQgMCAwIDAgNC4wOC0uODMgMTAuNjIgMTAuNjIgMCAwIDAgNS41OS01LjU5IDEwLjQ3IDEwLjQ3IDAgMCAwIDAtOC4xNiAxMC42MiAxMC42MiAwIDAgMC01LjU5LTUuNTkgMTAuNDggMTAuNDggMCAwIDAtOC4xNiAwIDEwLjYyIDEwLjYyIDAgMCAwLTUuNTkgNS41OSAxMC40OCAxMC40OCAwIDAgMCAwIDguMTYgMTAuNjIgMTAuNjIgMCAwIDAgNS41OSA1LjU5IDEwLjE0IDEwLjE0IDAgMCAwIDQuMDguODN6bTguNzUtMTIuMjV2MS43NWE4LjU3IDguNTcgMCAwIDEtLjY4IDMuNDEgOC43NSA4Ljc1IDAgMCAxLTQuNjYgNC42NiA4Ljg1IDguODUgMCAwIDEtNi44MiAwIDguODYgOC44NiAwIDAgMS0yLjc4LTEuODIgOC43IDguNyAwIDAgMS0xLjg3LTIuNzggOC43OSA4Ljc5IDAgMCAxLS4zNy01Ljc0IDguOTEgOC45MSAwIDAgMSAuODgtMi4wOSA4Ljc0IDguNzQgMCAwIDEgMS4zNy0xLjc3IDguODggOC44OCAwIDAgMSAxLjc3LTEuMzcgOC43NCA4Ljc0IDAgMCAxIDIuMDgtLjg5IDguNTYgOC41NiAwIDAgMSAyLjMzLS4zNmgxLjc1djd6bS04Ljc1IDguNzVhNi44NiA2Ljg2IDAgMCAwIDIuNzMtLjU1IDcgNyAwIDAgMCAzLjczLTMuNzMgNi44OCA2Ljg4IDAgMCAwIC41NC0yLjcyaC03di03YTYuNzcgNi43NyAwIDAgMC0yLjczLjU1IDcuMTYgNy4xNiAwIDAgMC0yLjI3IDEuNTEgNyA3IDAgMCAwLTEuNDUgMi4xOSA2LjkgNi45IDAgMCAwLS41NSAyLjc4IDYuNzQgNi43NCAwIDAgMCAuNTUgMi43MiA3IDcgMCAwIDAgMy43MyAzLjcxIDYuODEgNi44MSAwIDAgMCAyLjcyLjU0eiIgZmlsbD0iI2ZmZiIvPg0KPC9zdmc+DQo=',
    brandColor,
    description: 'Delays an action until a specific date. For shorter time periods, use the Delay action instead.',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['until'],
      properties: {
        until: {
          type: 'object',
          required: ['timestamp'],
          properties: {
            timestamp: {
              title: 'Timestamp',
              description: 'Example: 2016-07-11T14:45Z',
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    isInputsOptional: false,

    connector: scheduleConnector,

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
