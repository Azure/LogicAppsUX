import type {
  BindFunction,
  BoundParameter,
  BoundParameters,
  InputParameter,
  ListDynamicValue,
  OutputParameter,
  ParameterInfo,
  ReduceFunction,
} from '@microsoft/logic-apps-shared';
import {
  isDynamicListExtension,
  isDynamicTreeExtension,
  isLegacyDynamicValuesExtension,
  isLegacyDynamicValuesTreeExtension,
  isNullOrUndefined,
} from '@microsoft/logic-apps-shared';
import constants from '../../../../common/constants';
import BinderConstants from './constants';

export abstract class Binder {
  private _nodeParameters: Record<string, ParameterInfo>;
  private _metadata: Record<string, any> | undefined;

  constructor(nodeParameters: Record<string, ParameterInfo>, metadata: Record<string, any> | undefined) {
    this._nodeParameters = nodeParameters;
    this._metadata = metadata;
  }

  protected buildBoundParameter(
    displayName: string,
    value: any,
    visibility?: string,
    additionalProperties?: Partial<BoundParameter>
  ): BoundParameter {
    return {
      displayName,
      value,
      ...(visibility ? { visibility } : null),
      ...additionalProperties,
    };
  }

  protected getParameterDisplayName(parameter: OutputParameter): string {
    const { description, summary, title, name } = parameter;

    return title || summary || name || description || '';
  }

  protected getParameterValue(_inputs: any, _parameter: InputParameter): any {
    throw new Error('getParameterValue must be implemented by derived classes');
  }

  protected bindData = (data: any, parameter: OutputParameter | InputParameter): BoundParameter | undefined => {
    // inputs may be missing if we are trying to bind to inputs which do not exist, e.g., a card in an If
    // branch which never ran, because the condition expression was false
    if (isNullOrUndefined(data)) {
      return undefined;
    }

    const displayName = this.getParameterDisplayName(parameter);
    const value = this.getParameterValue(data, parameter);

    const { dynamicValues, visibility, key } = parameter;

    const boundParameter = this.buildBoundParameter(displayName, value, visibility, this._getAdditionalProperties(parameter));

    if (dynamicValues) {
      boundParameter.value =
        (isDynamicTreeExtension(dynamicValues) || isLegacyDynamicValuesTreeExtension(dynamicValues)) && this._metadata
          ? getDynamicTreeLookupValue(boundParameter, this._metadata)
          : isDynamicListExtension(dynamicValues) || isLegacyDynamicValuesExtension(dynamicValues)
            ? getDynamicListLookupValue(boundParameter, key, this._nodeParameters)
            : boundParameter.value;
    }

    return boundParameter;
  };

  protected makeBoundParameter(
    key: string,
    displayName: string,
    value: any,
    visibility?: string,
    additionalProperties?: Partial<BoundParameter>
  ): BoundParameters {
    return this._makeBoundParameters(key, this.buildBoundParameter(displayName, value, visibility, additionalProperties));
  }

  protected makeReducer(inputs: any, binder: BindFunction): ReduceFunction<BoundParameters, InputParameter> {
    return (previous: BoundParameters, current: InputParameter) => {
      const { name } = current;
      const boundParameter = binder(inputs, current);

      return boundParameter && !isNullOrUndefined(boundParameter.value)
        ? { ...previous, ...this._makeBoundParameters(name, boundParameter) }
        : previous;
    };
  }

  private _getAdditionalProperties(parameter: InputParameter): Partial<BoundParameter> | undefined {
    if (parameter.editor === constants.EDITOR.DICTIONARY) {
      return {
        format: BinderConstants.FORMAT.KEY_VALUE_PAIRS,
      };
    }

    if (parameter.editor === constants.EDITOR.CODE) {
      return {
        language: parameter.format || (parameter.editorOptions && parameter.editorOptions.language),
      };
    }

    return undefined;
  }

  private _makeBoundParameters(key: string, boundParameter: BoundParameter): BoundParameters {
    return {
      [key]: boundParameter,
    };
  }

  protected _makeOptionalBoundParameter(
    key: string,
    displayName: string,
    value: any,
    visibility?: string,
    additionalProperties?: Partial<BoundParameter>
  ): BoundParameters | undefined {
    return value === undefined ? undefined : this.makeBoundParameter(key, displayName, value, visibility, additionalProperties);
  }
}

const getDynamicListLookupValue = (boundInput: BoundParameter, key: string, nodeParameters: Record<string, ParameterInfo>): any => {
  const nodeInput = nodeParameters[key];
  if (!nodeInput || !nodeInput.editorOptions?.options?.length) {
    return boundInput.value;
  }

  const matchedOption = nodeInput.editorOptions.options.find(
    (option: ListDynamicValue) => option.value === boundInput.value
  ) as ListDynamicValue;
  return matchedOption ? matchedOption.displayName : boundInput.value;
};

const getDynamicTreeLookupValue = (boundInput: BoundParameter, metadata: Record<string, any>): any => {
  return metadata[boundInput.value] ?? boundInput.value;
};
