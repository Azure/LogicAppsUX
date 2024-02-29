import { StaticResultRootSchema } from './baseactionresult';
import { getIntl } from '@microsoft/logic-apps-shared';
import type { OpenApiSchema } from '@microsoft/logic-apps-shared';
import { clone } from '@microsoft/logic-apps-shared';

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
  defaultMessage: 'Validation Error',
  description: 'The title of the validation error field in the static result parseJson action',
});

const STATIC_RESULT_VALIDATION_ERROR_MESSAGE = intl.formatMessage({
  defaultMessage: 'Message',
  description: 'The title of the message field in the static result parseJson action',
});
const STATIC_RESULT_ERROR_LINE_NUMBER = intl.formatMessage({
  defaultMessage: 'Line number',
  description: 'The title of the line number field in the static result parseJson action',
});
const STATIC_RESULT_ERROR_LINE_POSITION = intl.formatMessage({
  defaultMessage: 'Line Position',
  description: 'The title of the line position field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_PATH = intl.formatMessage({
  defaultMessage: 'Path',
  description: 'The title of the path field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_VALUE = intl.formatMessage({
  defaultMessage: 'Value',
  description: 'The title of the value field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_ERROR_TYPE = intl.formatMessage({
  defaultMessage: 'Error Type',
  description: 'The title of the error type field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_SCHEMA_ID = intl.formatMessage({
  defaultMessage: 'Schema Id',
  description: 'The title of the schema id field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_SCHEMA_BASE_URI = intl.formatMessage({
  defaultMessage: 'Schema Uri',
  description: 'The title of the schema base uri field in the static result parseJson action',
});
const STATIC_RESULT_VALIDATION_ERROR_SCHEMA = intl.formatMessage({
  defaultMessage: 'Schema',
  description: 'The title of the schema field in the static result parseJson action',
});
const STATIC_RESULT_PARSE_JSON_CHILD_ERRORS = intl.formatMessage({
  defaultMessage: 'Internal Errors',
  description: 'The title of the internal errors field in the static result parseJson action',
});
const STATIC_RESULT_HTTP_BODY_TITLE = intl.formatMessage({
  defaultMessage: 'Body',
  description: 'The title of the body field in the static result parseJson action',
});
const STATIC_RESULT_PARSE_JSON_VALIDATION_ERRORS = intl.formatMessage({
  defaultMessage: 'Errors',
  description: 'The title of the errors field in the static result parseJson action',
});
const STATIC_RESULT_OPERATION_OUTPUT_TITLE = intl.formatMessage({
  defaultMessage: 'Output',
  description: 'The title of the output field in the static result parseJson action',
});
const STATIC_RESULT_PARSE_JSON_CHILD_ERRORS_TITLE = intl.formatMessage({
  defaultMessage: 'ChildErrors',
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
