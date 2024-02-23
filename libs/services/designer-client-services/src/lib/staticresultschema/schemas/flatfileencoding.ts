import { StaticResultRootSchema } from './baseactionresult';
import { getIntl } from '@microsoft/logic-apps-shared';

const intl = getIntl();

const STATIC_RESULT_HTTP_BODY_TITLE = intl.formatMessage({
  defaultMessage: 'Body',
  description: 'The title of the body field in the static result http action',
});
const STATIC_RESULT_OPERATION_OUTPUT_TITLE = intl.formatMessage({
  defaultMessage: 'Output',
  description: 'The title of the output field in the static result http action',
});

/**
 * The Action Fields definition of the flat file encoding action
 */
export const FlatFileEncodingStaticResultSchema = {
  ...StaticResultRootSchema,
  properties: {
    ...StaticResultRootSchema.properties,
    outputs: {
      properties: {
        body: {
          type: 'string',
          title: STATIC_RESULT_HTTP_BODY_TITLE,
        },
      },
      type: 'object',
      title: STATIC_RESULT_OPERATION_OUTPUT_TITLE,
      required: ['body'],
    },
  },
  required: [...(StaticResultRootSchema.required ?? [])],
};
