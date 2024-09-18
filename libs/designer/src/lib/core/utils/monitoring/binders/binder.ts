import type {
  BindFunction,
  BoundParameter,
  BoundParameters,
  InputParameter,
  LAOperation,
  ReduceFunction,
} from '@microsoft/logic-apps-shared';
import {
  DefaultKeyPrefix,
  equals,
  getPropertyValue,
  isNullOrUndefined,
  isString,
  ParameterLocations,
  removeConnectionPrefix,
  UriTemplateGenerator,
  UriTemplateParser,
} from '@microsoft/logic-apps-shared';
import constants from './constants';

export abstract class Binder {
  protected buildBoundParameter(
    displayName: string,
    value: any,
    visibility?: string,
    additionalProperties?: Partial<BoundParameter<any>>
  ): BoundParameter<any> {
    return {
      displayName,
      value,
      ...(visibility ? { visibility } : null),
      ...additionalProperties,
    };
  }

  protected disambiguateBoundParameter(
    boundParameters: BoundParameters | undefined,
    originalKey: string,
    newKey: string
  ): BoundParameters | undefined {
    if (!boundParameters || !Object.prototype.hasOwnProperty.call(boundParameters, originalKey)) {
      return boundParameters;
    }

    boundParameters = { ...boundParameters, [newKey]: boundParameters[originalKey] };
    delete boundParameters[originalKey];
    return boundParameters;
  }

  protected getInputParameterDisplayName(parameter: InputParameter): string {
    const { name, summary, title } = parameter;
    return title || summary || name;
  }

  protected getInputParameterValue(inputs: any, operation: LAOperation, parameter: InputParameter): any {
    const template = removeConnectionPrefix(operation.path);
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
      value = this.makePathObject(path, template);
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

  protected makeBindFunction(operation: LAOperation): BindFunction<InputParameter> {
    return (inputs: any, parameter: InputParameter): BoundParameter<any> | undefined => {
      // inputs may be missing if we are trying to bind to inputs which do not exist, e.g., a card in an If
      // branch which never ran, because the condition expression was false
      if (isNullOrUndefined(inputs)) {
        return undefined;
      }

      const displayName = this.getInputParameterDisplayName(parameter);
      const value = this.getInputParameterValue(inputs, operation, parameter);

      const { dynamicValues, name, visibility } = parameter;
      const boundParameter = this.buildBoundParameter(displayName, value, visibility);
      return dynamicValues ? { ...boundParameter, dynamicValue: name } : boundParameter;
    };
  }

  protected makeBoundParameter(
    key: string,
    displayName: string,
    value: any,
    visibility?: string,
    additionalProperties?: Partial<BoundParameter<any>>
  ): BoundParameters {
    return this._makeBoundParameters(key, this.buildBoundParameter(displayName, value, visibility, additionalProperties));
  }

  protected makeOptionalBoundParameter(
    key: string,
    displayName: string,
    value: any,
    visibility?: string,
    additionalProperties?: Partial<BoundParameter<any>>
  ): BoundParameters | undefined {
    return value === undefined ? undefined : this.makeBoundParameter(key, displayName, value, visibility, additionalProperties);
  }

  protected makePathObject(path: string, template: string): Record<string, string> {
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

  protected makeReducer<T extends { name: string }>(outputs: any, binder: BindFunction<T>): ReduceFunction<BoundParameters, T> {
    return (previous: BoundParameters, current: T) => {
      const { name } = current;
      const boundParameter = binder(outputs, current);

      return boundParameter && !isNullOrUndefined(boundParameter.value)
        ? { ...previous, ...this._makeBoundParameters(name, boundParameter) }
        : previous;
    };
  }

  protected makeUntypedInputsParameters(inputs: any): BoundParameters {
    return this.makeBoundParameter(constants.UNTYPED.INPUTS, 'Resources.DISPLAY_TEXT_UNTYPED_INPUTS', inputs);
  }

  protected resolveIdentifier(identifier: any): string {
    return isString(identifier) ? identifier : String(identifier.value);
  }

  private _makeBoundParameters(key: string, boundParameter: BoundParameter<any>): BoundParameters {
    return {
      [key]: boundParameter,
    };
  }
}
