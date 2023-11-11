import constants from '../../../common/constants';
import { loadParameterValuesFromDefault, toParameterInfoMap } from './helper';
import type { ParameterInfo , OpenAPIV2, RecurrenceSetting } from '@microsoft/logic-apps-designer';
import { OutputMapKey, SchemaProcessor, toInputParameter , map, RecurrenceType } from '@microsoft/logic-apps-designer';

export interface Recurrence {
  frequency: string | undefined;
  interval: number | undefined;
  startTime?: string;
  timeZone?: string;
  schedule?: {
    hours?: string[];
    minutes?: number[];
    weekDays?: string[];
  };
}

const getRecurrenceSchema = (recurrenceType?: RecurrenceType): OpenAPIV2.SchemaObject => {
  return {
    type: 'object',
    properties: {
      recurrence: {
        type: 'object',
        'x-ms-editor': 'recurrence',
        'x-ms-editor-options': {
          recurrenceType: recurrenceType,
          showPreview: true,
        },
        title: 'Recurrence',
      },
    },
    required: ['recurrence'],
  };
};

export const getRecurrenceParameters = (recurrence: RecurrenceSetting | undefined, operationDefinition: any): ParameterInfo[] => {
  if (!recurrence || recurrence.type === RecurrenceType.None) {
    return [];
  }

  const schema = getRecurrenceSchema(recurrence.type);
  const recurrenceParameters = new SchemaProcessor({
    dataKeyPrefix: 'recurrence.$',
    required: true,
    isInputSchema: true,
    keyPrefix: 'recurrence.$',
    expandArrayOutputs: false,
  })
    .getSchemaProperties(schema)
    .map((item) => toInputParameter(item, true /* suppressCasting */));

  const defaultRecurrence = constants.DEFAULT_RECURRENCE;

  for (const parameter of recurrenceParameters) {
    if (!parameter.default) {
      parameter.default = defaultRecurrence;
    }
  }

  if (operationDefinition) {
    for (const parameter of recurrenceParameters) {
      parameter.value = operationDefinition?.recurrence ?? defaultRecurrence;
    }
  } else {
    loadParameterValuesFromDefault(map(recurrenceParameters, OutputMapKey));
  }

  return toParameterInfoMap(recurrenceParameters, operationDefinition);
};
