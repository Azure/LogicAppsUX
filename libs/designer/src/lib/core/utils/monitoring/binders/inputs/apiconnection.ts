import {
  type InputParameter,
  getIntl,
  type BoundParameters,
  unmap,
  type LAOperation,
  type ParameterInfo,
  isNullOrUndefined,
  removeConnectionPrefix,
  ParameterLocations,
  getPropertyValue,
  equals,
  DefaultKeyPrefix,
  UriTemplateParser,
  UriTemplateGenerator,
} from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class ApiConnectionInputsBinder extends Binder {
  private _operation: LAOperation;

  constructor(operation: LAOperation, nodeParameters: Record<string, ParameterInfo>, metadata: Record<string, any> | undefined) {
    super(nodeParameters, metadata);
    this._operation = operation;
  }

  async bind(inputs: any, inputParameters: Record<string, InputParameter>): Promise<BoundParameters> {
    if (inputs === undefined) {
      return inputs;
    }
    if (!inputParameters || !this._operation) {
      return this._makeUntypedInputsParameters(inputs);
    }

    return unmap(inputParameters).reduce(this.makeReducer(inputs, this.bindData), {} as BoundParameters);
  }

  getParameterValue(inputs: any, parameter: InputParameter): any {
    const template = removeConnectionPrefix(this._operation.path);
    const { body, headers, path, queries } = inputs;
    const { encode, in: $in, key, name } = parameter;

    let value: any;
    if (key === `${ParameterLocations.Body}.${DefaultKeyPrefix}`) {
      value = body;
    } else if (equals($in, ParameterLocations.Body)) {
      value = getPropertyValue(body, name);
    } else if (equals($in, ParameterLocations.Header)) {
      value = getPropertyValue(headers, name);
    } else if (equals($in, ParameterLocations.Path)) {
      value = this._makePathObject(path, template);
      value = getPropertyValue(value, name);
    } else if (equals($in, ParameterLocations.Query)) {
      value = getPropertyValue(queries, name);
    } else {
      value = inputs;
    }

    if (equals($in, ParameterLocations.Path) && !isNullOrUndefined(value)) {
      if (equals(encode, 'triple')) {
        value = decodeURIComponent(decodeURIComponent(decodeURIComponent(value)));
      } else if (equals(encode, 'double')) {
        value = decodeURIComponent(decodeURIComponent(value));
      } else {
        value = decodeURIComponent(value);
      }
    }

    return value;
  }

  private _makePathObject(path: string, template: string): Record<string, string> {
    const segments = UriTemplateParser.parse(template);
    const templateMatcher = UriTemplateGenerator.generateRegularExpressionForTemplate(segments);
    const pathParameters = templateMatcher.exec(template);
    if (pathParameters === null) {
      return {};
    }

    const pathMatcher = UriTemplateGenerator.generateRegularExpressionForPath(segments);
    const pathValues = pathMatcher.exec(path);
    if (pathValues === null) {
      return {};
    }

    const parameters = pathParameters.slice(1);
    const values = pathValues.slice(1);

    return parameters.reduce((acc: Record<string, any>, current: string, index): Record<string, any> => {
      acc[current] = values[index];
      return acc;
    }, {});
  }

  private _makeUntypedInputsParameters(inputs: any): BoundParameters {
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
      ...this._makeOptionalBoundParameter(constants.API_CONNECTION.HOST, intlMessages[constants.API_CONNECTION.HOST], host),
      ...this._makeOptionalBoundParameter(constants.API_CONNECTION.METHOD, intlMessages[constants.API_CONNECTION.METHOD], method),
      ...this._makeOptionalBoundParameter(constants.API_CONNECTION.PATH, intlMessages[constants.API_CONNECTION.PATH], path),
      ...this._makeOptionalBoundParameter(
        constants.API_CONNECTION.AUTHENTICATION,
        intlMessages[constants.API_CONNECTION.AUTHENTICATION],
        authentication
      ),
      ...this._makeOptionalBoundParameter(constants.API_CONNECTION.BODY, intlMessages[constants.API_CONNECTION.BODY], body),
      ...this._makeOptionalBoundParameter(
        constants.API_CONNECTION.HEADERS,
        intlMessages[constants.API_CONNECTION.HEADERS],
        headers,
        /* visibility */ undefined,
        {
          format: constants.FORMAT.KEY_VALUE_PAIRS,
        }
      ),
      ...this._makeOptionalBoundParameter(constants.API_CONNECTION.QUERIES, intlMessages[constants.API_CONNECTION.QUERIES], queries),
    };
  }
}
