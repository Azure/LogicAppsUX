import type { BoundParameters, OperationManifest, OutputParameter, ParameterInfo } from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import constants from '../../../../common/constants';
import { ManifestOutputsBinder, DefaultOutputsBinder, ApiConnectionOutputsBinder } from './outputs/index';

export default class OutputsBinder {
  async bind(
    outputs: any,
    type: string,
    outputParametersByName: Record<string, OutputParameter>,
    manifest?: OperationManifest,
    nodeParameters?: Record<string, ParameterInfo>,
    operationMetadata?: Record<string, any>
  ): Promise<BoundParameters[]> {
    let outputArray: any[];

    if (!Array.isArray(outputs)) {
      outputArray = [outputs];
    } else if (outputs.length === 0) {
      outputArray = [];
    } else if (outputs[0] && Object.prototype.hasOwnProperty.call(outputs[0], 'outputs')) {
      outputArray = outputs.map((output) => output.outputs);
    } else {
      outputArray = [outputs];
    }

    const getBoundParameters = async (output: any): Promise<BoundParameters> => {
      if (
        manifest &&
        !equals(type, constants.NODE.TYPE.IF) &&
        !equals(type, constants.NODE.TYPE.FOREACH) &&
        !equals(type, constants.NODE.TYPE.SWITCH) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION_NOTIFICATION)
      ) {
        const binder = new ManifestOutputsBinder(manifest, nodeParameters ?? {}, operationMetadata);
        return binder.bind(output, outputParametersByName);
      }

      if (
        equals(type, constants.NODE.TYPE.API_CONNECTION) ||
        equals(type, constants.NODE.TYPE.API_CONNECTION_WEBHOOK) ||
        equals(type, constants.NODE.TYPE.API_CONNECTION_NOTIFICATION)
      ) {
        const binder = new ApiConnectionOutputsBinder(nodeParameters ?? {}, operationMetadata);
        return binder.bind(output, outputParametersByName);
      }

      const binder = new DefaultOutputsBinder(nodeParameters ?? {}, operationMetadata);
      return binder.bind(output);
    };

    return Promise.all(outputArray.map(getBoundParameters));
  }
}
