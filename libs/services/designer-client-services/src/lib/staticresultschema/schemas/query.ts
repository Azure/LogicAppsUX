import { StaticResultRootSchema } from './baseactionresult';
import { getIntl } from '@microsoft/intl-logic-apps';

const intl = getIntl();
const QUERY_OUTPUT_TITLE = intl.formatMessage({
  defaultMessage: 'Output',
  description: 'The title of the output field in the static result query action',
});
const STATIC_RESULT_OPERATION_OUTPUT_TITLE = intl.formatMessage({
  defaultMessage: 'Output',
  description: 'The title of the output field in the static result query action',
});

/**
 * The Action Fields definition of the query Action
 */
export const QueryStaticResultSchema = {
  ...StaticResultRootSchema,
  properties: {
    ...StaticResultRootSchema.properties,
    outputs: {
      properties: {
        body: {
          type: 'array',
          title: QUERY_OUTPUT_TITLE,
          items: {},
        },
      },
      type: 'object',
      title: STATIC_RESULT_OPERATION_OUTPUT_TITLE,
      required: ['body'],
    },
  },
  required: [...(StaticResultRootSchema.required ?? [])],
};
