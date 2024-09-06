import { type LogicApps, getIntl, type BoundParameters, Visibility } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class FunctionInputsBinder extends Binder {
  bind(inputs: LogicApps.FunctionInputs): BoundParameters {
    if (!inputs) {
      return {};
    }
    const intl = getIntl();
    const intlMessages = {
      [constants.FUNCTION.NAME]: intl.formatMessage({
        defaultMessage: 'Function name',
        id: '0dcU8r',
        description: 'Function name',
      }),
      [constants.FUNCTION.APP_NAME]: intl.formatMessage({
        defaultMessage: 'Function app name',
        id: 'EcxLP7',
        description: 'Function app name',
      }),
      [constants.FUNCTION.URI]: intl.formatMessage({
        defaultMessage: 'URI',
        id: 'dkocw6',
        description: 'URI',
      }),
      [constants.FUNCTION.AUTHENTICATION]: intl.formatMessage({
        defaultMessage: 'Authentication',
        id: 'ZFNlSA',
        description: 'Authentication',
      }),
      [constants.FUNCTION.BODY]: intl.formatMessage({
        defaultMessage: 'Body',
        id: '4SIrVn',
        description: 'Body',
      }),
      [constants.FUNCTION.METHOD]: intl.formatMessage({
        defaultMessage: 'Method',
        id: 'PTBl5s',
        description: 'Method',
      }),
      [constants.FUNCTION.HEADERS]: intl.formatMessage({
        defaultMessage: 'Headers',
        id: 'VchR9d',
        description: 'Headers',
      }),
      [constants.FUNCTION.QUERIES]: intl.formatMessage({
        defaultMessage: 'Queries',
        id: 'mxSILx',
        description: 'Queries',
      }),
    };

    // NOTE(lin): Per contract, the properties in 'inputs' are case-insensitive.
    // However, we deference them case-sensitively because:
    //   1) Current implementation normalizes these properties to camel casing.
    //   2) Looking up nested properties case-insensitively incurs considerable perf penalty.
    const { authentication, body, headers, method, queries } = inputs;

    const functionName = inputs.function ? inputs.function.name : undefined;
    const functionAppName = inputs.functionApp ? inputs.functionApp.name : undefined;

    // TODO(lin): Render the parameters as if in the designer card according to swagger schema if available, for both input and output binding.
    return {
      ...this.makeOptionalBoundParameter(constants.FUNCTION.NAME, intlMessages[constants.FUNCTION.NAME], functionName),
      ...this.makeOptionalBoundParameter(constants.FUNCTION.APP_NAME, intlMessages[constants.FUNCTION.APP_NAME], functionAppName),
      ...this.makeOptionalBoundParameter(constants.FUNCTION.URI, intlMessages[constants.FUNCTION.URI], inputs.uri),
      ...this.makeOptionalBoundParameter(
        constants.FUNCTION.AUTHENTICATION,
        intlMessages[constants.FUNCTION.AUTHENTICATION],
        authentication
      ),
      ...this.makeOptionalBoundParameter(constants.FUNCTION.BODY, intlMessages[constants.FUNCTION.BODY], body),
      ...this.makeOptionalBoundParameter(constants.FUNCTION.METHOD, intlMessages[constants.FUNCTION.METHOD], method, Visibility.Advanced),
      ...this.makeOptionalBoundParameter(
        constants.FUNCTION.HEADERS,
        intlMessages[constants.FUNCTION.HEADERS],
        headers,
        Visibility.Advanced,
        {
          format: constants.FORMAT.KEY_VALUE_PAIRS,
        }
      ),
      ...this.makeOptionalBoundParameter(
        constants.FUNCTION.QUERIES,
        intlMessages[constants.FUNCTION.QUERIES],
        queries,
        Visibility.Advanced
      ),
    };
  }
}
