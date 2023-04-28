import constants from '../../../common/constants';
import { loadParameterValuesFromDefault, toParameterInfoMap } from './helper';
import type { ParameterInfo } from '@microsoft/designer-ui';
import { OutputMapKey, SchemaProcessor, toInputParameter } from '@microsoft/parsers-logic-apps';
import type { OpenAPIV2, RecurrenceSetting } from '@microsoft/utils-logic-apps';
import { map, RecurrenceType } from '@microsoft/utils-logic-apps';

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

export const getRecurrenceParameters = (
  recurrence: RecurrenceSetting | undefined,
  operationDefinition: any,
  sku?: string
): ParameterInfo[] => {
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

  const defaultRecurrence = getDefaultRecurrenceBySku(sku);

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

export function getDefaultRecurrenceBySku(sku?: string): Recurrence {
  if (!sku) return constants.DEFAULT_RECURRENCE.PREMIUM;

  switch (sku) {
    case constants.SKU.STANDARD:
    case constants.SKU.WORKFLOW_STANDARD:
      return constants.DEFAULT_RECURRENCE.STANDARD;
    case constants.SKU.PREMIUM:
    case constants.SKU.WORKFLOW_PREMIUM:
      return constants.DEFAULT_RECURRENCE.PREMIUM;
    case constants.SKU.CONSUMPTION:
      return constants.DEFAULT_RECURRENCE.CONSUMPTION;
    default:
      return constants.DEFAULT_RECURRENCE.FREE;
  }
}
