import { getIntl } from '../../../../intl/src';
import type { OpenApiSchema } from '../../../../parsers';
import { clone } from '../../../../utils/src';
import { StaticResultRootSchema } from './baseactionresult';

const intl = getIntl();

function getAllValidationErrorType(): string[] {
  return [
    'None',
    'MultipleOf',
    'Maximum',
    'Minimum',
    'MaximumLength',
    'MinimumLength',
    'Pattern',
    'AdditionalItems',
    'Items',
    'MaximumItems',
    'MinimumItems',
    'UniqueItems',
    'MaximumProperties',
    'MinimumProperties',
    'Required',
    'AdditionalProperties',
    'Dependencies',
    'Enum',
    'Type',
    'AllOf',
    'AnyOf',
    'OneOf',
    'Not',
    'Format',
    'Id',
    'PatternProperties',
    'Validator',
    'Valid',
    'Const',
    'Contains',
  ];
}

const STATIC_RESULT_VALIDATION_ERROR_TITLE = intl.formatMessage({
  defaultMessage: 'Validation error',
  id: 'msed91751ebd9b',
  description: 'The title of the validation error field in the static result parseJson action',
});

const STATIC_RESULT_VALIDATION_ERROR_MESSAGE = intl.formatMessage({
  defaultMessage: 'Message',
  id: 'ms904236c718ee',
  description: 'The title of the message field in the static result parseJson action',
});
const STATIC_RESULT_ERROR_LINE_NUMBER = intl.formatMessage({
  defaultMessage: 'Line number',
  id: 'ms4711b1afe30d',
  description: 'The title of the line number field in the static result parseJson action',
});
const STATIC_RESULT_ERROR_LINE_POSITION = intl.formatMessage({
  defaultMessage: 'Line position',
  id: 'ms44e0bed7e604',
  description: 'The title of the line position field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_PATH = intl.formatMessage({
  defaultMessage: 'Path',
  id: 'msa583736e3394',
  description: 'The title of the path field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_VALUE = intl.formatMessage({
  defaultMessage: 'Value',
  id: 'msd26d98d7f0ff',
  description: 'The title of the value field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_ERROR_TYPE = intl.formatMessage({
  defaultMessage: 'Error type',
  id: 'msdc9102ed43fb',
  description: 'The title of the error type field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_SCHEMA_ID = intl.formatMessage({
  defaultMessage: 'Schema ID',
  id: 'ms2bd391628e74',
  description: 'The title of the schema id field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_SCHEMA_BASE_URI = intl.formatMessage({
  defaultMessage: 'Schema URI',
  id: 'ms730f45889fd6',
  description: 'The title of the schema base uri field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_SCHEMA = intl.formatMessage({
  defaultMessage: 'Schema',
  id: 'ms45b24d564d98',
  description: 'The title of the schema field in the static result parseJson action',
});
const STATIC_RESULT_PARSE_JSON_CHILD_ERRORS = intl.formatMessage({
  defaultMessage: 'Internal errors',
  id: 'ms13bd1176d8b9',
  description: 'The title of the internal errors field in the static result parseJson action',
});
const STATIC_RESULT_HTTP_BODY_TITLE = intl.formatMessage({
  defaultMessage: 'Body',
  id: 'ms6fd46f97d621',
  description: 'The title of the body field in the static result parseJson action',
});
const STATIC_RESULT_PARSE_JSON_VALIDATION_ERRORS = intl.formatMessage({
  defaultMessage: 'Errors',
  id: 'msa108c859ffd6',
  description: 'The title of the errors field in the static result parseJson action',
});
const STATIC_RESULT_OPERATION_OUTPUT_TITLE = intl.formatMessage({
  defaultMessage: 'Output',
  id: 'ms2bbfc39d9777',
  description: 'The title of the output field in the static result parseJson action',
});
const STATIC_RESULT_PARSE_JSON_CHILD_ERRORS_TITLE = intl.formatMessage({
  defaultMessage: 'ChildErrors',
  id: 'msf5819c4f6074',
  description: 'The title of the child errors field in the static result parseJson action',
});

function getValidationErrorSchema(): OpenApiSchema {
  const validationErrorSchema: OpenApiSchema = {
    type: 'object',
    title: STATIC_RESULT_VALIDATION_ERROR_TITLE,
    properties: {
      message: {
        type: 'string',
        title: STATIC_RESULT_VALIDATION_ERROR_MESSAGE,
      },
      lineNumber: {
        type: 'integer',
        title: STATIC_RESULT_ERROR_LINE_NUMBER,
      },
      linePosition: {
        type: 'integer',
        title: STATIC_RESULT_ERROR_LINE_POSITION,
      },
      path: {
        type: 'string',
        title: STATIC_RESULT_VALIDATION_ERROR_PATH,
      },
      value: {
        title: STATIC_RESULT_VALIDATION_ERROR_VALUE,
      },
      errorType: {
        type: 'string',
        title: STATIC_RESULT_VALIDATION_ERROR_ERROR_TYPE,
        enum: getAllValidationErrorType(),
      },
      schemaId: {
        type: 'string',
        title: STATIC_RESULT_VALIDATION_ERROR_SCHEMA_ID,
        format: 'uri',
      },
      schemaBaseUri: {
        type: 'string',
        title: STATIC_RESULT_VALIDATION_ERROR_SCHEMA_BASE_URI,
        format: 'uri',
      },
      schema: {
        type: 'object',
        title: STATIC_RESULT_VALIDATION_ERROR_SCHEMA,
      },
      childErrors: {
        title: STATIC_RESULT_PARSE_JSON_CHILD_ERRORS,
        type: 'array',
        items: { title: STATIC_RESULT_PARSE_JSON_CHILD_ERRORS_TITLE },
      },
    },
  };

  const subErrorSchema = clone(validationErrorSchema);
  if (validationErrorSchema?.properties?.['childErrors']) {
    validationErrorSchema.properties['childErrors'].items = subErrorSchema;
  }

  return validationErrorSchema;
}
/**
 * The Action Fields definition of the flat file encoding action
 */
export const ParseJsonStaticResultSchema = {
  ...StaticResultRootSchema,
  properties: {
    ...StaticResultRootSchema.properties,
    outputs: {
      properties: {
        body: {
          title: STATIC_RESULT_HTTP_BODY_TITLE,
        },
        errors: {
          type: 'array',
          title: STATIC_RESULT_PARSE_JSON_VALIDATION_ERRORS,
          items: getValidationErrorSchema(),
        },
      },
      type: 'object',
      title: STATIC_RESULT_OPERATION_OUTPUT_TITLE,
    },
  },
  required: [...(StaticResultRootSchema.required ?? [])],
};
