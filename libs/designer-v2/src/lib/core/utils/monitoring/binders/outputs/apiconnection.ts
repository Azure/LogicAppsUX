import {
  type BoundParameter,
  equals,
  isNullOrEmpty,
  isNullOrUndefined,
  isObject,
  type OutputParameter,
  unmap,
  type BoundParameters,
  type OutputParameters,
  OutputSource,
  getIntl,
  getPropertyValue,
} from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class ApiConnectionOutputsBinder extends Binder {
  bind(outputs: any, parameters?: OutputParameters): BoundParameters {
    if (outputs === undefined) {
      return outputs;
    }
    if (this.shouldShowUntypedOutputs(parameters)) {
      return isObject(outputs) ? this.makeUntypedOutputsParameters(outputs) : {};
    }

    const boundParameters = unmap(parameters).reduce(
      this.makeReducer(outputs, (values, parameter) => this.bindOutputParameterToTypedOutputs(values, parameter)),
      {} as BoundParameters
    );

    return isNullOrEmpty(boundParameters) ? (isObject(outputs) ? this.makeUntypedOutputsParameters(outputs) : {}) : boundParameters;
  }

  protected bindOutputParameterToTypedOutputs(outputs: any, parameter: OutputParameter): BoundParameter {
    const { source, visibility, name } = parameter;
    const displayName = this.getParameterDisplayName(parameter);

    let value: any;
    if (equals(source, OutputSource.Headers)) {
      value = outputs.headers;
      value = getPropertyValue(value, name);
    } else if (equals(source, OutputSource.StatusCode)) {
      value = outputs.statusCode;
    } else if (equals(source, OutputSource.Outputs)) {
      value = outputs.outputs;
      value = getPropertyValue(value, name);
    } else {
      value = outputs.body;
      value = getPropertyValue(value, name);
    }
    return this.buildBoundParameter(displayName, value, visibility);
  }

  protected shouldShowUntypedOutputs(parameters: OutputParameters | undefined): boolean {
    if (isNullOrUndefined(parameters)) {
      return true;
    }

    const keys = Object.keys(parameters);
    const length = keys.length;
    if (length > 1) {
      return false;
    }
    if (length === 1) {
      const [key] = keys;
      return key === 'body.$' && ['any', 'array'].indexOf(parameters[key].type) !== -1;
    }
    return true;
  }

  protected makeUntypedOutputsParameters(outputs: any): BoundParameters {
    const { body, headers, statusCode } = outputs;

    const intl = getIntl();

    const intlMessages = {
      [constants.OUTPUTS.STATUS_CODE]: intl.formatMessage({
        defaultMessage: 'Status Code',
        id: 'm5InJc',
        description: 'status code',
      }),
      [constants.OUTPUTS.HEADERS]: intl.formatMessage({
        defaultMessage: 'Headers',
        id: '1HhCtq',
        description: 'headers',
      }),
      [constants.OUTPUTS.BODY]: intl.formatMessage({
        defaultMessage: 'Body',
        id: 'zkqKJ+',
        description: 'body',
      }),
    };

    const boundParameters = {
      ...this._makeOptionalBoundParameter(constants.OUTPUTS.STATUS_CODE, intlMessages[constants.OUTPUTS.STATUS_CODE], statusCode),
      ...this._makeOptionalBoundParameter(
        constants.OUTPUTS.HEADERS,
        intlMessages[constants.OUTPUTS.HEADERS],
        headers,
        /* visibility */ undefined,
        {
          format: constants.FORMAT.KEY_VALUE_PAIRS,
        }
      ),
      ...this._makeOptionalBoundParameter(constants.OUTPUTS.BODY, intlMessages[constants.OUTPUTS.BODY], body),
    };

    return boundParameters;
  }
}
