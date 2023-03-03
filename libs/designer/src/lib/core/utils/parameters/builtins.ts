import { loadParameterValuesFromDefault, toParameterInfoMap } from './helper';
import { frequencyValues } from '@microsoft/designer-client-services-logic-apps';
import type { ParameterInfo } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import { OutputMapKey, parseEx, SchemaProcessor, toInputParameter } from '@microsoft/parsers-logic-apps';
import type { RecurrenceSetting } from '@microsoft/utils-logic-apps';
import {
  getScheduleDayValues,
  getScheduleHourValues,
  getTimezoneValues,
  getObjectPropertyValue,
  map,
  RecurrenceType,
} from '@microsoft/utils-logic-apps';

const intl = getIntl();
const timeZoneValues = getTimezoneValues(intl);
const basicRecurrenceSchema = {
  type: 'object',
  properties: {
    frequency: {
      type: 'string',
      'x-ms-editor': 'combobox',
      'x-ms-editor-options': {
        options: frequencyValues,
      },
      default: 'Minute',
      title: 'Frequency',
    },
    interval: {
      type: 'number',
      title: 'Interval',
      default: 3,
    },
    startTime: {
      type: 'string',
      format: 'datetime',
      description: 'Example: 2017-03-24T15:00:00Z',
    },
    timeZone: {
      type: 'string',
      title: 'Timezone',
      'x-ms-editor': 'combobox',
      'x-ms-editor-options': {
        options: timeZoneValues,
      },
    },
  },
  required: ['frequency', 'interval'],
};

const advancedRecurrenceSchema = {
  type: 'object',
  properties: {
    ...basicRecurrenceSchema.properties,
    schedule: {
      type: 'object',
      properties: {
        hours: {
          type: 'array',
          title: 'At these hours',
          description: 'Example: 0, 10',
          'x-ms-editor': 'dropdown',
          'x-ms-editor-options': {
            multiSelect: true,
            titleSeparator: ',',
            serialization: { valueType: 'array' },
            options: getScheduleHourValues(intl),
          },
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [
              {
                name: 'recurrence.frequency',
                values: ['Day', 'Week'],
              },
            ],
          },
        },
        minutes: {
          type: 'array',
          title: 'At these minutes',
          description: 'Enter the valid minute values (from 0 to 59) separated by comma, e.g., 15,30',
          'x-ms-editor': 'string',
          'x-ms-editor-options': {
            csvValue: true,
          },
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [
              {
                name: 'recurrence.frequency',
                values: ['Day', 'Week'],
              },
            ],
          },
        },
        weekDays: {
          type: 'array',
          title: 'On these days',
          description: 'Example: Monday, Friday',
          'x-ms-editor': 'dropdown',
          'x-ms-editor-options': {
            multiSelect: true,
            titleSeparator: ',',
            serialization: { valueType: 'array' },
            options: getScheduleDayValues(intl),
          },
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [
              {
                name: 'recurrence.frequency',
                values: ['Week'],
              },
            ],
          },
        },
      },
      required: [],
    },
  },
  required: ['frequency', 'interval'],
};

export const getRecurrenceParameters = (recurrence: RecurrenceSetting | undefined, operationDefinition: any): ParameterInfo[] => {
  if (!recurrence || recurrence.type === RecurrenceType.None) {
    return [];
  }

  const schema = recurrence.type === RecurrenceType.Advanced ? advancedRecurrenceSchema : basicRecurrenceSchema;
  const recurrenceParameters = new SchemaProcessor({
    dataKeyPrefix: 'recurrence.$',
    required: true,
    isInputSchema: true,
    keyPrefix: 'recurrence.$',
    expandArrayOutputs: false,
  })
    .getSchemaProperties(schema)
    .map((item) => toInputParameter(item, true /* suppressCasting */));

  if (operationDefinition) {
    for (const parameter of recurrenceParameters) {
      const propertyNames = parseEx(parameter.key.replace('.$', '')).map((segment) => (segment.value ?? '').toString());
      parameter.value = getObjectPropertyValue(operationDefinition, propertyNames);
    }
  } else {
    loadParameterValuesFromDefault(map(recurrenceParameters, OutputMapKey));
  }

  return toParameterInfoMap(recurrenceParameters, operationDefinition);
};
