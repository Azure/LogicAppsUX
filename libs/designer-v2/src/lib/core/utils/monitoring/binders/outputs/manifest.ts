import {
  type OutputParameter,
  type BoundParameters,
  getObjectPropertyValue,
  type OperationManifest,
  type ParameterInfo,
  unmap,
} from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import { updateParameterWithValues } from '../../../parameters/helper';

export class ManifestOutputsBinder extends Binder {
  private _operationManifest: OperationManifest;

  constructor(manifest: OperationManifest, nodeParameters: Record<string, ParameterInfo>, metadata: Record<string, any> | undefined) {
    super(nodeParameters, metadata);
    this._operationManifest = manifest;
  }

  async bind(outputs: any, outputsParameters: Record<string, OutputParameter>): Promise<BoundParameters> {
    if (outputs === undefined) {
      return outputs;
    }

    return unmap(outputsParameters).reduce(this.makeReducer(outputs, this.bindData), {} as BoundParameters);
  }

  getParameterValue(outputs: any, parameter: OutputParameter): any {
    return parameter.alias
      ? getObjectPropertyValue(outputs, [parameter.alias as string])
      : this._getValueByParameterKey(outputs, parameter);
  }

  private _getValueByParameterKey(outputs: any, parameter: OutputParameter): any {
    const { key } = parameter;
    const prefix = key.substring(0, key.indexOf('$') + 1);

    const parametersValue = updateParameterWithValues(
      prefix,
      outputs,
      /* in */ '',
      [parameter],
      /* createInvisibleParameter */ false,
      /* useDefault */ false
    );

    return parametersValue.length > 0 ? parametersValue[0]?.value : undefined;
  }
}
