import {
  type BoundParameters,
  getObjectPropertyValue,
  type InputParameter,
  type OperationManifest,
  type ParameterInfo,
  type SwaggerParser,
  unmap,
} from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import { getInputsValueFromDefinitionForManifest, updateParameterWithValues } from '../../../parameters/helper';

export class ManifestInputsBinder extends Binder {
  private _operationManifest: OperationManifest;

  constructor(manifest: OperationManifest, nodeParameters: Record<string, ParameterInfo>, metadata: Record<string, any> | undefined) {
    super(nodeParameters, metadata);
    this._operationManifest = manifest;
  }

  async bind(
    inputs: any,
    inputParameters: Record<string, InputParameter>,
    customSwagger: SwaggerParser | undefined
  ): Promise<BoundParameters> {
    if (inputs === undefined) {
      return inputs;
    }

    const inputsToBind = { inputs };

    const operationInputs = getInputsValueFromDefinitionForManifest(
      this._operationManifest.properties.inputsLocation ?? ['inputs'],
      this._operationManifest,
      customSwagger,
      inputsToBind,
      unmap(inputParameters)
    );

    return unmap(inputParameters).reduce(this.makeReducer(operationInputs, this.bindData), {} as BoundParameters);
  }

  getParameterValue(inputs: any, parameter: InputParameter): any {
    return parameter.alias ? getObjectPropertyValue(inputs, [parameter.alias as string]) : this._getValueByParameterKey(inputs, parameter);
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
