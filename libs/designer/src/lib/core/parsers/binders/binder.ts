import type { BoundParameter, BoundParameters, InputParameter, OutputParameter, Swagger } from '@microsoft/logic-apps-shared';
import {
  DefaultKeyPrefix,
  equals,
  isNullOrUndefined,
  isString,
  OutputKeys,
  OutputSource,
  ParameterLocations,
  removeConnectionPrefix,
  UriTemplateGenerator,
  UriTemplateParser,
} from '@microsoft/logic-apps-shared';
import constants from './constants';
import type { BindFunction, ReduceFunction } from './types';

export abstract class Binder {
  protected bindOutputParameterToTypedOutputs(outputs: any, parameter: OutputParameter): BoundParameter<any> {
    const { name, source, visibility } = parameter;
    const displayName = this.getOutputParameterDisplayName(parameter);
    const identifiers = this.parsePath(name).filter((identifier) => {
      return !equals(this.resolveIdentifier(identifier), OutputKeys.Body);
    });

    let value: any;
    if (equals(source, OutputSource.Headers)) {
      value = outputs.headers;
    } else if (equals(source, OutputSource.StatusCode)) {
      value = outputs.statusCode;
    } else {
      value = outputs.body;
    }

    while (identifiers.length > 0 && !isNullOrUndefined(value)) {
      const identifier = this.resolveIdentifier(identifiers.shift()!);

      if (equals(identifier, OutputKeys.Body)) {
        value = value.body;
      } else if (equals(identifier, OutputKeys.Headers)) {
        value = value.headers;
      } else if (equals(identifier, OutputKeys.Name)) {
        value = value.name;
      } else if (equals(identifier, OutputKeys.Properties)) {
        value = value.properties;
      } else if (Object.prototype.hasOwnProperty.call(value, identifier)) {
        value = value[identifier];
      } else {
        value = undefined;
      }
    }

    return this.buildBoundParameter(displayName, value, visibility);
  }

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

  protected getInputParameterValue(inputs: any, operation: Swagger.Operation, parameter: InputParameter): any {
    const template = removeConnectionPrefix(operation.path);
    const { body, headers, path, queries } = inputs;
    const { encode, in: $in, key, name } = parameter;

    let value: any;
    if (key === `${ParameterLocations.Body}.${DefaultKeyPrefix}`) {
      value = body;
    } else {
      const identifiers = this.parsePath(name).filter((identifier) => {
        return !equals(this.resolveIdentifier(identifier), OutputKeys.Body);
      });

      if (equals($in, ParameterLocations.Body)) {
        value = body;
      } else if (equals($in, ParameterLocations.Header)) {
        value = headers;
      } else if (equals($in, ParameterLocations.Path)) {
        value = this.makePathObject(path, template);
      } else if (equals($in, ParameterLocations.Query)) {
        value = queries;
      } else {
        value = inputs;
      }

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

  protected getOutputParameterDisplayName(parameter: OutputParameter): string {
    const { description, name, summary, title } = parameter;
    const displayName = title || summary || description;

    if (displayName) {
      return displayName;
    }

    switch (name) {
      case OutputKeys.Body:
        return 'Resources.BODY_PARAMETER';
      case OutputKeys.Outputs:
        return 'Resources.OUTPUTS';
      default:
        return name;
    }
  }

  protected makeBindFunction(operation: Swagger.Operation) {
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

  protected parsePath(_path: string): any[] {
    const identifiers: any[] = [];
    // try {
    //   ({ identifiers } = PathParser.parse(path, Delimiters.Argument, /* strict */ false));
    // } catch {
    //   // NOTE(joechung): When this code was originally written, ' was not supported in properties. Now we must escape ' to '' so the parser can work correctly.
    //   ({ identifiers } = PathParser.parse(`[${convertToStringLiteral(path)}]`, Delimiters.Argument, /* strict */ false));
    // }

    return identifiers;
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
