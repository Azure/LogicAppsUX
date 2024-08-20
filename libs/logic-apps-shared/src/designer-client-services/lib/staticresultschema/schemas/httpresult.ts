import { getIntl } from '../../../../intl/src';
import type { OpenApiSchema } from '../../../../parsers';
import { StaticResultRootSchema } from './baseactionresult';

const intl = getIntl();

const STATIC_RESULT_HTTP_STATUS_CODE_TITLE = intl.formatMessage({
  defaultMessage: 'Status code',
  id: 'Gk79Ma',
  description: 'The title of the status code field in the static result http action',
});
const STATIC_RESULT_HTTP_BODY_TITLE = intl.formatMessage({
  defaultMessage: 'Body',
  id: 'C1cy54',
  description: 'The title of the body field in the static result http action',
});
const STATIC_RESULT_HTTP_HEADERS_TITLE = intl.formatMessage({
  defaultMessage: 'Headers',
  id: 'HSJLCu',
  description: 'The title of the headers field in the static result http action',
});
const STATIC_RESULT_OPERATION_OUTPUT_TITLE = intl.formatMessage({
  defaultMessage: 'Output',
  id: 'UZiXVh',
  description: 'The title of the output field in the static result http action',
});

/**
 * The Action Fields definition of the Http Action
 */
export const HttpStaticResultSchema = {
  ...StaticResultRootSchema,
  properties: {
    ...StaticResultRootSchema.properties,
    outputs: {
      properties: {
        statusCode: {
          type: 'string',
          title: STATIC_RESULT_HTTP_STATUS_CODE_TITLE,
          default: 'OK',
          enum: getAllValidStatusCodes(true),
        },
        headers: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
          title: STATIC_RESULT_HTTP_HEADERS_TITLE,
        } as OpenApiSchema,
        body: {
          type: 'string',
          title: STATIC_RESULT_HTTP_BODY_TITLE,
        } as OpenApiSchema,
      },
      type: 'object',
      title: STATIC_RESULT_OPERATION_OUTPUT_TITLE,
      required: ['statusCode', 'headers'],
    },
  },
  required: [...(StaticResultRootSchema.required ?? [])],
};

function getAllValidStatusCodes(includeNumbers = true): string[] {
  const statusCodeArray = [
    'Accepted',
    'Ambiguous',
    'BadGateway',
    'BadRequest',
    'Conflict',
    'Continue',
    'Created',
    'ExpectationFailed',
    'Forbidden',
    'Found',
    'GatewayTimeout',
    'Gone',
    'HttpVersionNotSupported',
    'InternalServerError',
    'LengthRequired',
    'MethodNotAllowed',
    'Moved',
    'MovedPermanently',
    'MultipleChoices',
    'NoContent',
    'NonAuthoritativeInformation',
    'NotAcceptable',
    'NotFound',
    'NotImplemented',
    'NotModified',
    'OK',
    'PartialContent',
    'PaymentRequired',
    'PreconditionFailed',
    'ProxyAuthenticationRequired',
    'Redirect',
    'RedirectKeepVerb',
    'RedirectMethod',
    'RequestedRangeNotSatisfiable',
    'RequestEntityTooLarge',
    'RequestTimeout',
    'RequestUriTooLong',
    'ResetContent',
    'SeeOther',
    'ServiceUnavailable',
    'SwitchingProtocols',
    'TemporaryRedirect',
    'Unauthorized',
    'UnsupportedMediaType',
    'Unused',
    'UpgradeRequired',
    'UseProxy',
  ];

  if (includeNumbers) {
    for (let i = 200; i < 600; i++) {
      statusCodeArray.push(i.toString());
    }
  }

  return statusCodeArray;
}
