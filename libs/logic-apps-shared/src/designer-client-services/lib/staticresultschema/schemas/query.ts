import { getIntl } from '../../../../intl/src';
import { StaticResultRootSchema } from './baseactionresult';

const intl = getIntl();
const QUERY_OUTPUT_TITLE = intl.formatMessage({
  defaultMessage: 'Body',
  id: 'e4ebc68271a9',
  description: 'The title of the body field in the static result query action',
});
const STATIC_RESULT_OPERATION_OUTPUT_TITLE = intl.formatMessage({
  defaultMessage: 'Output',
  id: 'a130646d4391',
  description: 'The title of the output field in the static result query action',
});
const STATIC_RESULT_OPERATION_BODY_ITEM = intl.formatMessage({
  defaultMessage: 'Body item',
  id: 'e9ea64582dd6',
  description: 'The title of the child item field in the static result query action',
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
          items: { title: STATIC_RESULT_OPERATION_BODY_ITEM },
        },
      },
      type: 'object',
      title: STATIC_RESULT_OPERATION_OUTPUT_TITLE,
      required: ['body'],
    },
  },
  required: [...(StaticResultRootSchema.required ?? [])],
};
