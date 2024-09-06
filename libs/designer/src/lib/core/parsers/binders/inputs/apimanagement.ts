import {
  type LogicAppsV2,
  type InputParameter,
  type Swagger,
  getIntl,
  type BoundParameters,
  unmap,
  Visibility,
} from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

/**
 * @class
 * A utility blass to bind inputs to strongly typed input parameters if an API definition is available.
 */
export default class ApiManagementInputsBinder extends Binder {
  /**
   * Bind inputs to strongly typed input parameters if an API definition describing the operation is available.
   *
   * @arg {LogicAppsV2.ApiManagementInputs} inputs
   * An object with inputs to bind to input parameters.
   *
   * @arg {Record<string, InputParameter>} [inputParameters]
   * An object with the input parameter schema used to bind the inputs to input parameters.
   *
   * @arg {Swagger.Operation} [operation]
   * An object with operation metadata used to bind the inputs to input parameters.
   *
   * @return {BoundParameters}
   * A hash mapping input keys to a strongly typed set of bound input parameters.
   */
  bind(
    inputs: LogicAppsV2.ApiManagementInputs,
    inputParameters?: Record<string, InputParameter>,
    operation?: Swagger.Operation
  ): BoundParameters {
    if (!inputParameters || !operation) {
      return this.makeUntypedInputsParameters(inputs);
    }

    const boundParameters = unmap(inputParameters).reduce(
      this.makeReducer(inputs, this.makeBindFunction(operation)),
      {} as BoundParameters
    );

    return boundParameters;
  }

  /**
   * Bind inputs to a standard set of untyped input parameters if an API definition is unavailable.
   *
   * @arg {LogicAppsV2.ApiManagementInputs} inputs
   * An object with inputs to bind to input parameters.
   *
   * @return {BoundParameters}
   * A hash mapping input keys to a standard set of bound input parameters.
   */
  makeUntypedInputsParameters(inputs: LogicAppsV2.ApiManagementInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const {
      api: { id, name },
      authentication,
      body,
      headers,
      method,
      pathTemplate,
      queries,
      subscriptionKey,
    } = inputs;

    const intl = getIntl();
    const intlMessages = {
      [constants.API_MANAGEMENT.ID]: intl.formatMessage({
        defaultMessage: 'API ID',
        id: '4KR3Bs',
        description: 'API ID',
      }),
      [constants.API_MANAGEMENT.NAME]: intl.formatMessage({
        defaultMessage: 'API Name',
        id: 'jrKamk',
        description: 'API Name',
      }),
      [constants.API_MANAGEMENT.PATH_TEMPLATE]: intl.formatMessage({
        defaultMessage: 'Path Template',
        id: '8G7KMD',
        description: 'Path Template',
      }),
      [constants.API_MANAGEMENT.METHOD]: intl.formatMessage({
        defaultMessage: 'Method',
        id: 'PTBl5s',
        description: 'Method',
      }),
      [constants.HTTP.BODY]: intl.formatMessage({
        defaultMessage: 'Body',
        id: '4SIrVn',
        description: 'Body',
      }),
      [constants.HTTP.HEADERS]: intl.formatMessage({
        defaultMessage: 'Headers',
        id: 'VchR9d',
        description: 'Headers',
      }),
      [constants.HTTP.QUERIES]: intl.formatMessage({
        defaultMessage: 'Queries',
        id: 'mxSILx',
        description: 'Queries',
      }),
      [constants.API_MANAGEMENT.SUBSCRIPTION_KEY]: intl.formatMessage({
        defaultMessage: 'Subscription Key',
        id: 'Kt9vOa',
        description: 'Subscription Key',
      }),
      [constants.HTTP.AUTHENTICATION]: intl.formatMessage({
        defaultMessage: 'Authentication',
        id: 'ZFNlSA',
        description: 'Authentication',
      }),
    };

    return {
      ...this.makeBoundParameter(constants.API_MANAGEMENT.ID, intlMessages[constants.API_MANAGEMENT.ID], id),
      ...this.makeBoundParameter(constants.API_MANAGEMENT.NAME, intlMessages[constants.API_MANAGEMENT.NAME], name),
      ...this.makeBoundParameter(
        constants.API_MANAGEMENT.PATH_TEMPLATE,
        intlMessages[constants.API_MANAGEMENT.PATH_TEMPLATE],
        pathTemplate
      ),
      ...this.makeOptionalBoundParameter(constants.API_MANAGEMENT.METHOD, intlMessages[constants.API_MANAGEMENT.METHOD], method),
      ...this.makeOptionalBoundParameter(constants.HTTP.BODY, intlMessages[constants.HTTP.BODY], body),
      ...this.makeOptionalBoundParameter(
        constants.HTTP.HEADERS,
        intlMessages[constants.HTTP.HEADERS],
        headers,
        /* visibility */ undefined,
        {
          format: constants.FORMAT.KEY_VALUE_PAIRS,
        }
      ),
      ...this.makeOptionalBoundParameter(constants.HTTP.QUERIES, intlMessages[constants.HTTP.QUERIES], queries),
      ...this.makeOptionalBoundParameter(
        constants.API_MANAGEMENT.SUBSCRIPTION_KEY,
        intlMessages[constants.API_MANAGEMENT.SUBSCRIPTION_KEY],
        subscriptionKey
      ),
      ...this.makeOptionalBoundParameter(
        constants.HTTP.AUTHENTICATION,
        intlMessages[constants.HTTP.AUTHENTICATION],
        authentication,
        Visibility.Advanced
      ),
    };
  }
}
