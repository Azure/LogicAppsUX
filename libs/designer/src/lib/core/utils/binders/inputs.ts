import type {
  BoundParameter,
  BoundParameters,
  InputParameter,
  LAOperation,
  ListDynamicValue,
  LogicApps,
  OperationManifest,
  ParameterInfo,
  SwaggerParser,
} from '@microsoft/logic-apps-shared';
import { equals, getObjectPropertyValue, isDynamicListExtension, isDynamicTreeExtension, unmap } from '@microsoft/logic-apps-shared';
import { Binder } from '../../parsers/binders/binder';
import {
  ApiConnectionInputsBinder,
  DefaultInputsBinder,
  FlatFileInputsBinder,
  IfInputsBinder,
  IntegrationAccountArtifactLookupInputsBinder,
  LiquidInputsBinder,
  ManualInputsBinder,
  RecurrenceInputsBinder,
  SendToBatchInputsBinder,
  SwitchInputsBinder,
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
    operation?: LAOperation | undefined,
    manifest?: OperationManifest,
    customSwagger?: SwaggerParser,
    nodeParameters?: Record<string, ParameterInfo>,
    operationMetadata?: Record<string, any>,
    recurrence?: LogicApps.Recurrence,
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
        const binder = new ManifestInputsBinder(manifest, nodeParameters ?? {}, operationMetadata);
        return binder.bind(input, inputParametersByName, customSwagger);
      }
      if (equals(type, constants.NODE.TYPE.API_CONNECTION) || equals(type, constants.NODE.TYPE.API_CONNECTION_WEBHOOK)) {
        const binder = new ApiConnectionInputsBinder();
        return binder.bind(input, inputParametersByName, operation);
      }
      if (equals(type, constants.NODE.TYPE.FLAT_FILE_DECODING) || equals(type, constants.NODE.TYPE.FLAT_FILE_ENCODING)) {
        const binder = new FlatFileInputsBinder();
        return binder.bind(input);
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
  private _nodeParameters: Record<string, ParameterInfo>;
  private _metadata: Record<string, any> | undefined;

  constructor(manifest: OperationManifest, nodeParameters: Record<string, ParameterInfo>, metadata: Record<string, any> | undefined) {
    super();
    this._operationManifest = manifest;
    this._nodeParameters = nodeParameters;
    this._metadata = metadata;
  }

  async bind(
    inputs: any,
    inputParameters: Record<string, InputParameter>,
    customSwagger: SwaggerParser | undefined
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

    return dynamicValues ? { ...boundParameter, dynamicValue: key } : boundParameter;
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
      /* createInvisibleParameter */ false,
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

  const matchedOption = nodeInput.editorOptions.options.find(
    (option: ListDynamicValue) => option.value === boundInput.value
  ) as ListDynamicValue;
  return matchedOption ? matchedOption.displayName : boundInput.value;
};

const getDynamicTreeLookupValue = (boundInput: BoundParameter<any>, metadata: Record<string, any>): any => {
  return metadata[boundInput.value] ?? boundInput.value;
};
