import type { BoundParameter, BoundParameters, InputParameter, LogicApps, OperationManifest, Swagger } from '@microsoft/logic-apps-shared';
import { equals, getObjectPropertyValue, isNullOrUndefined, unmap } from '@microsoft/logic-apps-shared';
import { Binder } from '../../parsers/binders/binder';
import { ApiConnectionInputsBinder, DefaultInputsBinder, RecurrenceInputsBinder } from '../../parsers/binders/binders';
import constants from '../../../common/constants';
import BinderConstants from '../../parsers/binders/constants';
import { updateParameterWithValues } from '../parameters/helper';

export default class InputsBinder {
  bind(
    inputs: any, // tslint:disable-line: no-any
    type: string,
    _kind: string | undefined,
    inputParametersByName: Record<string, InputParameter>,
    operation: Swagger.Operation,
    manifest?: OperationManifest,
    recurrence?: LogicApps.Recurrence,
    placeholderForDynamicInputs?: InputParameter,
    _recurrenceParameters?: InputParameter[]
  ): BoundParameters[] {
    let inputArray: any[]; // tslint:disable-line: no-any
    if (!Array.isArray(inputs)) {
      inputArray = [inputs];
    } else if (inputs.length === 0) {
      inputArray = [];
    } else {
      inputArray = [inputs];
    }

    return inputArray.map((input: any): BoundParameters => {
      // tslint:disable-line: no-any
      if (
        manifest &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION_NOTIFICATION)
      ) {
        const binder = new ManifestInputsBinder(manifest, placeholderForDynamicInputs);
        return binder.bind(input, inputParametersByName);
      }
      if (equals(type, constants.NODE.TYPE.API_CONNECTION) || equals(type, constants.NODE.TYPE.API_CONNECTION_WEBHOOK)) {
        const binder = new ApiConnectionInputsBinder();
        return binder.bind(input, inputParametersByName, operation);
      }
      if (equals(type, constants.NODE.TYPE.RECURRENCE) && recurrence) {
        const binder = new RecurrenceInputsBinder();
        return binder.bind(recurrence);
      }
      const binder = new DefaultInputsBinder();
      return binder.bind(input);
    });
  }
}

class ManifestInputsBinder extends Binder {
  private _operationManifest: OperationManifest;
  private _location: string[];
  private _placeholderForDynamicInputs: InputParameter | undefined;

  constructor(manifest: OperationManifest, placeholderForDynamicInputs: InputParameter | undefined) {
    super();
    this._operationManifest = manifest;
    this._location = this._operationManifest.properties.inputsLocation ? this._operationManifest.properties.inputsLocation.slice(1) : [];
    this._placeholderForDynamicInputs = placeholderForDynamicInputs;
  }

  // tslint:disable-next-line: no-any
  bind(inputs: any, inputParameters: Record<string, InputParameter>): BoundParameters {
    if (inputs === undefined) {
      return {};
    }

    const boundInputParameters = unmap(inputParameters).reduce(this.makeReducer(inputs, this._bindData), {} as BoundParameters);

    return { ...boundInputParameters };
  }

  // tslint:disable-next-line: no-any
  private _bindData = (inputs: any, parameter: InputParameter): BoundParameter<any> | undefined => {
    // inputs may be missing if we are trying to bind to inputs which do not exist, e.g., a card in an If
    // branch which never ran, because the condition expression was false
    if (inputs === undefined) {
      return undefined;
    }

    const displayName = this.getInputParameterDisplayName(parameter);

    const value = parameter.alias ? this._getValueByParameterAlias(inputs, parameter) : this._getValueByParameterKey(inputs, parameter);

    const { dynamicValues, name, visibility } = parameter;

    const boundParameter = this.buildBoundParameter(displayName, value, visibility, this._getAdditionalProperties(parameter));

    return dynamicValues ? { ...boundParameter, dynamicValue: name } : boundParameter;
  };

  private _getValueByParameterAlias(inputs: any, parameter: InputParameter) {
    const location = this._location.concat(parameter.alias ?? '');
    return getObjectPropertyValue(inputs, location);
  }

  // tslint:disable-next-line: no-any
  private _getAdditionalProperties(parameter: InputParameter): Partial<BoundParameter<any>> | undefined {
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

  private _getValueByParameterKey(inputs: any, parameter: InputParameter): any {
    if (parameter.isDynamic && this._placeholderForDynamicInputs) {
      return this._getValueForDynamicParameter(inputs, parameter);
    }

    const { key } = parameter;
    const prefix = key.substring(0, key.indexOf('$') + 1);
    const isInputs = prefix === 'inputs.$';
    const dataPath = isInputs ? this._location : [];

    const parameterValue = updateParameterWithValues(
      prefix,
      !isNullOrUndefined(inputs) && typeof inputs === 'object' ? getObjectPropertyValue(inputs, dataPath) : inputs,
      /* in */ '',
      [parameter]
    );

    return parameterValue[0].value;
  }

  private _getValueForDynamicParameter(inputs: any, parameter: InputParameter): any {
    // NOTE(psamband): Dynamic inputs do not have keys and name prefixed, so we get the placeholders' dynamic parameter value
    // to provide as seed value to look up dynamic parameters.
    const { key, name } = this._placeholderForDynamicInputs as InputParameter;
    const parameterLocation = key.indexOf('inputs.$.') > -1 ? key.replace('inputs.$.', '').split('.') : this._location;
    const valueForDynamicSchemaParameter =
      !isNullOrUndefined(inputs) && typeof inputs === 'object' ? getObjectPropertyValue(inputs, parameterLocation) : inputs;

    if (equals(parameter.name, name)) {
      return valueForDynamicSchemaParameter;
    }

    if (!isNullOrUndefined(valueForDynamicSchemaParameter) && typeof valueForDynamicSchemaParameter === 'object') {
      return getObjectPropertyValue(valueForDynamicSchemaParameter, parameter.name.split('.'));
    }

    return undefined;
  }
}
