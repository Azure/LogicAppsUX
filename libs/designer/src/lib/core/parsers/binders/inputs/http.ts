import type { InputParameter, BoundParameters, Swagger, LogicApps } from '@microsoft/logic-apps-shared';
import {
  equals,
  ExtensionProperties,
  getIntl,
  isNullOrUndefined,
  OutputKeys,
  ParameterLocations,
  removeConnectionPrefix,
  unmap,
  Visibility,
} from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class HttpInputsBinder extends Binder {
  bind(inputs: LogicApps.HttpInputs, parameters?: Record<string, InputParameter>, operation?: Swagger.Operation): BoundParameters {
    if (!parameters || !operation) {
      return this.makeUntypedInputsParameters(inputs);
    }

    const boundParameters = unmap(parameters).reduce(this.makeReducer(inputs, this.makeBindFunction(operation)), {} as BoundParameters);

    return boundParameters;
  }

  // NOTE(joechung): Path parameters are in inputs.uri, not inputs.path, for HTTP+Swagger operations.
  getInputParameterValue(inputs: any, operation: Swagger.Operation, parameter: InputParameter): any {
    let value = super.getInputParameterValue(inputs, operation, parameter);

    const { encode, in: $in, name } = parameter;
    if (equals($in, ParameterLocations.Path)) {
      const identifiers = this.parsePath(name).filter((identifier) => {
        return !equals(this.resolveIdentifier(identifier), OutputKeys.Body);
      });

      let pathname: string;
      try {
        ({ pathname } = new URL(inputs.uri));
      } catch {
        pathname = '';
      }

      const template = removeConnectionPrefix(operation[ExtensionProperties.Path]);
      value = this.makePathObject(pathname, template);

      while (identifiers.length > 0 && !isNullOrUndefined(value)) {
        const identifier = this.resolveIdentifier(identifiers.shift()!);
        value = Object.prototype.hasOwnProperty.call(value, identifier) ? value[identifier] : undefined;
      }
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

  makeUntypedInputsParameters(inputs: LogicApps.HttpInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.HTTP.METHOD]: intl.formatMessage({
        defaultMessage: 'Method',
        id: 'PTBl5s',
        description: 'Method',
      }),
      [constants.HTTP.URI]: intl.formatMessage({
        defaultMessage: 'URI',
        id: 'dkocw6',
        description: 'URI',
      }),
      [constants.HTTP.AUTHENTICATION]: intl.formatMessage({
        defaultMessage: 'Authentication',
        id: 'ZFNlSA',
        description: 'Authentication',
      }),
      [constants.HTTP.COOKIE]: intl.formatMessage({
        defaultMessage: 'Cookie',
        id: 'R+AgKk',
        description: 'Cookie',
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
    };

    const { authentication, body, cookie, headers, method, queries, uri } = inputs;
    return {
      ...this.makeBoundParameter(constants.HTTP.METHOD, intlMessages[constants.HTTP.METHOD], method),
      ...this.makeBoundParameter(constants.HTTP.URI, intlMessages[constants.HTTP.URI], uri),
      ...this.makeOptionalBoundParameter(
        constants.HTTP.AUTHENTICATION,
        intlMessages[constants.HTTP.AUTHENTICATION],
        authentication,
        Visibility.Advanced
      ),
      ...this.makeOptionalBoundParameter(constants.HTTP.COOKIE, intlMessages[constants.HTTP.COOKIE], cookie, Visibility.Advanced),
      ...this.makeOptionalBoundParameter(constants.HTTP.BODY, intlMessages[constants.HTTP.BODY], body),
      ...this.makeOptionalBoundParameter(constants.HTTP.HEADERS, intlMessages[constants.HTTP.HEADERS], headers),
      ...this.makeOptionalBoundParameter(constants.HTTP.QUERIES, intlMessages[constants.HTTP.QUERIES], queries),
    };
  }
}
