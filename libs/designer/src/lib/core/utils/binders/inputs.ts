import type { BoundParameter, BoundParameters, InputParameter, LogicApps, OperationManifest, Swagger, SwaggerParser } from '@microsoft/logic-apps-shared';
import { equals, getObjectPropertyValue, isNullOrUndefined, unmap } from '@microsoft/logic-apps-shared';
import { Binder } from '../../parsers/binders/binder';
import {
  ApiConnectionInputsBinder,
  ApiManagementInputsBinder,
  DefaultInputsBinder,
  FlatFileInputsBinder,
  FunctionInputsBinder,
  HttpInputsBinder,
  IfInputsBinder,
  IntegrationAccountArtifactLookupInputsBinder,
  LiquidInputsBinder,
  ManualInputsBinder,
  RecurrenceInputsBinder,
  SendToBatchInputsBinder,
  SwitchInputsBinder,
  WaitInputsBinder,
  WorkflowInputsBinder,
  XmlValidationInputsBinder,
  XsltInputsBinder,
} from '../../parsers/binders/binders';
import constants from '../../../common/constants';
import BinderConstants from '../../parsers/binders/constants';
import { getInputsValueFromDefinitionForManifest, updateParameterWithValues } from '../parameters/helper';

export default class InputsBinder {
  async bind(
    inputs: any,
    type: string,
    kind: string | undefined,
    inputParametersByName: Record<string, InputParameter>,
    operation: Swagger.Operation,
    manifest?: OperationManifest,
    customSwagger?: SwaggerParser,
    recurrence?: LogicApps.Recurrence,
    placeholderForDynamicInputs?: InputParameter,
    _recurrenceParameters?: InputParameter[]
  ): Promise<BoundParameters[]> {
    let inputArray: any[];
    if (!Array.isArray(inputs)) {
      inputArray = [inputs];
    } else if (inputs.length === 0) {
      inputArray = [];
    } else {
      inputArray = [inputs];
    }

    const getBoundParameters = async (input: any): Promise<BoundParameters> => {
      if (
        manifest &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION_NOTIFICATION)
      ) {
        const binder = new ManifestInputsBinder(manifest, placeholderForDynamicInputs);
        return binder.bind(input, inputParametersByName, customSwagger);
      }
      if (equals(type, constants.NODE.TYPE.API_CONNECTION) || equals(type, constants.NODE.TYPE.API_CONNECTION_WEBHOOK)) {
        const binder = new ApiConnectionInputsBinder();
        return binder.bind(input, inputParametersByName, operation);
      }
      if (equals(type, constants.NODE.TYPE.API_MANAGEMENT)) {
        const binder = new ApiManagementInputsBinder();
        return binder.bind(input, inputParametersByName, operation);
      }
      if (equals(type, constants.NODE.TYPE.FLAT_FILE_DECODING) || equals(type, constants.NODE.TYPE.FLAT_FILE_ENCODING)) {
        const binder = new FlatFileInputsBinder();
        return binder.bind(input);
      }
      if (equals(type, constants.NODE.TYPE.FUNCTION)) {
        const binder = new FunctionInputsBinder();
        return binder.bind(input);
      }
      if (equals(type, constants.NODE.TYPE.HTTP)) {
        const binder = new HttpInputsBinder();
        return binder.bind(input, inputParametersByName, operation);
      }
      if (equals(type, constants.NODE.TYPE.IF)) {
        const binder = new IfInputsBinder();
        return binder.bind(input);
      }
      if (equals(type, constants.NODE.TYPE.INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP)) {
        const binder = new IntegrationAccountArtifactLookupInputsBinder();
        return binder.bind(input);
      }
      if (equals(type, constants.NODE.TYPE.LIQUID)) {
        const binder = new LiquidInputsBinder();
        return binder.bind(input);
      }
      if (equals(type, constants.NODE.TYPE.REQUEST)) {
        const binder = new ManualInputsBinder();
        return binder.bind(input, kind);
      }
      if (equals(type, constants.NODE.TYPE.SEND_TO_BATCH)) {
        const binder = new SendToBatchInputsBinder();
        return binder.bind(input);
      }
      if (equals(type, constants.NODE.TYPE.SWITCH)) {
        const binder = new SwitchInputsBinder();
        return binder.bind(input);
      }
      if (equals(type, constants.NODE.TYPE.WORKFLOW)) {
        const binder = new WorkflowInputsBinder();
        return binder.bind(input, inputParametersByName);
      }
      if (equals(type, constants.NODE.TYPE.XML_VALIDATION)) {
        const binder = new XmlValidationInputsBinder();
        return binder.bind(input);
      }
      if (equals(type, constants.NODE.TYPE.XSLT)) {
        const binder = new XsltInputsBinder();
        return binder.bind(input);
      }
      if (equals(type, constants.NODE.TYPE.RECURRENCE) && recurrence) {
        const binder = new RecurrenceInputsBinder();
        return binder.bind(recurrence);
      }
      const binder = new DefaultInputsBinder();
      return binder.bind(input);
    };

    return Promise.all(inputArray.map(getBoundParameters));
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

  async bind(inputs: any, inputParameters: Record<string, InputParameter>, customSwagger: SwaggerParser | undefined): Promise<BoundParameters> {
    if (inputs === undefined) {
      return {};
    }

    const inputsToBind = { inputs };
    
    const operationInputs = getInputsValueFromDefinitionForManifest(
      this._operationManifest.properties.inputsLocation ?? ['inputs'],
      this._operationManifest,
      customSwagger,
      inputsToBind,
      unmap(inputParameters)
    );
    const boundInputParameters = unmap(inputParameters).reduce(this.makeReducer(operationInputs, this._bindData), {} as BoundParameters);

    return { ...boundInputParameters };
  }

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
    return getObjectPropertyValue(inputs, [parameter.alias as string]);
  }

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

    const parametersValue = updateParameterWithValues(
      prefix,
      inputs,
      /* in */ '',
      [parameter],
      /* createInvisibleParameter */ false,
      /* useDefault */ false,
    );

    return parametersValue.length > 0 ? parametersValue[0]?.value : undefined;
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
