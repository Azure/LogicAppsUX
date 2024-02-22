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
 * The Action Fields definition of the flat file decoding action
 */
export const FlatFileDecodingStaticResultSchema = {
  ...StaticResultRootSchema,
  properties: {
    ...StaticResultRootSchema.properties,
    outputs: {
      properties: {
        body: {
          type: 'string',
          format: 'binary',
          title: STATIC_RESULT_HTTP_BODY_TITLE,
          default: 'Sample file data',
        },
      },
      type: 'object',
      title: STATIC_RESULT_OPERATION_OUTPUT_TITLE,
      required: ['body'],
    },
  },
  required: [...(StaticResultRootSchema.required ?? [])],
};
