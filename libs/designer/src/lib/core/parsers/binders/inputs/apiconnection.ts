import { type InputParameter, type Swagger, getIntl, type BoundParameters, unmap } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class ApiConnectionInputsBinder extends Binder {
  async bind(inputs: any, inputParameters?: Record<string, InputParameter>, operation?: Swagger.Operation): Promise<BoundParameters> {
    if (!inputParameters || !operation) {
      return this.makeUntypedInputsParameters(inputs);
    }
    const boundInputParameters = unmap(inputParameters).reduce(
      this.makeReducer(inputs, this.makeBindFunction(operation)),
      {} as BoundParameters
    );
    return { ...boundInputParameters };
  }

  makeUntypedInputsParameters(inputs: any): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();

    const intlMessages = {
      [constants.API_CONNECTION.HOST]: intl.formatMessage({
        defaultMessage: 'Host',
        id: 'MqZCAn',
        description: 'Host',
      }),
      [constants.API_CONNECTION.METHOD]: intl.formatMessage({
        defaultMessage: 'Method',
        id: 'PTBl5s',
        description: 'Method',
      }),
      [constants.API_CONNECTION.PATH]: intl.formatMessage({
        defaultMessage: 'Path',
        id: 'nuNBYE',
        description: 'Path',
      }),
      [constants.API_CONNECTION.AUTHENTICATION]: intl.formatMessage({
        defaultMessage: 'Authentication',
        id: 'ZFNlSA',
        description: 'Authentication',
      }),
      [constants.API_CONNECTION.BODY]: intl.formatMessage({
        defaultMessage: 'Body',
        id: '4SIrVn',
        description: 'Body',
      }),
      [constants.API_CONNECTION.HEADERS]: intl.formatMessage({
        defaultMessage: 'Headers',
        id: 'VchR9d',
        description: 'Headers',
      }),
      [constants.API_CONNECTION.QUERIES]: intl.formatMessage({
        defaultMessage: 'Queries',
        id: 'mxSILx',
        description: 'Queries',
      }),
    };

    const { authentication, body, headers, host, method, path, queries } = inputs;
    return {
      ...this.makeOptionalBoundParameter(constants.API_CONNECTION.HOST, intlMessages[constants.API_CONNECTION.HOST], host),
      ...this.makeOptionalBoundParameter(constants.API_CONNECTION.METHOD, intlMessages[constants.API_CONNECTION.METHOD], method),
      ...this.makeOptionalBoundParameter(constants.API_CONNECTION.PATH, intlMessages[constants.API_CONNECTION.PATH], path),
      ...this.makeOptionalBoundParameter(
        constants.API_CONNECTION.AUTHENTICATION,
        intlMessages[constants.API_CONNECTION.AUTHENTICATION],
        authentication
      ),
      ...this.makeOptionalBoundParameter(constants.API_CONNECTION.BODY, intlMessages[constants.API_CONNECTION.BODY], body),
      ...this.makeOptionalBoundParameter(
        constants.API_CONNECTION.HEADERS,
        intlMessages[constants.API_CONNECTION.HEADERS],
        headers,
        /* visibility */ undefined,
        {
          format: constants.FORMAT.KEY_VALUE_PAIRS,
        }
      ),
      ...this.makeOptionalBoundParameter(constants.API_CONNECTION.QUERIES, intlMessages[constants.API_CONNECTION.QUERIES], queries),
    };
  }
}
