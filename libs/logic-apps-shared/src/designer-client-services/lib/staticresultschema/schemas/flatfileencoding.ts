import { getIntl } from '../../../../intl/src';
import { StaticResultRootSchema } from './baseactionresult';

const intl = getIntl();

const STATIC_RESULT_HTTP_BODY_TITLE = intl.formatMessage({
  defaultMessage: 'Body',
  id: 'ms0b5732e78079',
  description: 'The title of the body field in the static result http action',
});
const STATIC_RESULT_OPERATION_OUTPUT_TITLE = intl.formatMessage({
  defaultMessage: 'Output',
  id: 'ms519897561daf',
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
