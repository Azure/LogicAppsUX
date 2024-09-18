import {
  type BoundParameter,
  type BoundParameters,
  getObjectPropertyValue,
  type InputParameter,
  isDynamicListExtension,
  isDynamicTreeExtension,
  type ListDynamicValue,
  type OperationManifest,
  type ParameterInfo,
  type SwaggerParser,
  unmap
} from "@microsoft/logic-apps-shared";
import { Binder } from "../binder";
import constants from "../../../../../common/constants";
import { getInputsValueFromDefinitionForManifest, updateParameterWithValues } from "../../../parameters/helper";
import BinderConstants from "../constants";

export class ManifestInputsBinder extends Binder {
    private _operationManifest: OperationManifest;
    private _nodeParameters: Record<string, ParameterInfo>;
    private _metadata: Record<string, any> | undefined;
    private _shouldCreateParametersFromInputs: boolean;
  
    constructor(manifest: OperationManifest, nodeParameters: Record<string, ParameterInfo>, metadata: Record<string, any> | undefined, operationType: string) {
      super();
      this._operationManifest = manifest;
      this._nodeParameters = nodeParameters;
      this._metadata = metadata;
      this._shouldCreateParametersFromInputs = operationType === constants.NODE.TYPE.FOREACH ||
        operationType === constants.NODE.TYPE.CONDITION ||
        operationType === constants.NODE.TYPE.SWITCH;
    }
  
    async bind(
      inputs: any,
      inputParameters: Record<string, InputParameter>,
      customSwagger: SwaggerParser | undefined,
    ): Promise<BoundParameters> {
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
      const { dynamicValues, key, visibility } = parameter;
      const boundParameter = this.buildBoundParameter(displayName, value, visibility, this._getAdditionalProperties(parameter));
  
      if (dynamicValues) {
        boundParameter.value = isDynamicListExtension(dynamicValues)
          ? getDynamicListLookupValue(boundParameter, key, this._nodeParameters)
          : isDynamicTreeExtension(dynamicValues) && this._metadata
            ? getDynamicTreeLookupValue(boundParameter, this._metadata)
            : boundParameter.value;
      }
  
  
      return boundParameter;
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
      const { key } = parameter;
      const prefix = key.substring(0, key.indexOf('$') + 1);
  
      const parametersValue = updateParameterWithValues(
        prefix,
        inputs,
        /* in */ '',
        [parameter],
        /* createInvisibleParameter */ this._shouldCreateParametersFromInputs,
        /* useDefault */ false
      );
  
      return parametersValue.length > 0 ? parametersValue[0]?.value : undefined;
    }
  }
  
const getDynamicListLookupValue = (boundInput: BoundParameter<any>, key: string, nodeParameters: Record<string, ParameterInfo>): any => {
    const nodeInput = nodeParameters[key];
    if (!nodeInput || !nodeInput.editorOptions?.options?.length) {
        return boundInput.value;
    }

    const matchedOption = nodeInput.editorOptions.options.find((option: ListDynamicValue) => option.value === boundInput.value) as ListDynamicValue;
    return matchedOption ? matchedOption.displayName : boundInput.value;
};

const getDynamicTreeLookupValue = (boundInput: BoundParameter<any>, metadata: Record<string, any>): any => {
    return metadata[boundInput.value] ?? boundInput.value;
};