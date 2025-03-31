import type {
  BoundParameters,
  InputParameter,
  LAOperation,
  OperationManifest,
  ParameterInfo,
  SwaggerParser,
} from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import { ApiConnectionInputsBinder, DefaultInputsBinder, ManifestInputsBinder } from './inputs/index';
import constants from '../../../../common/constants';

export default class InputsBinder {
  async bind(
    inputs: any,
    type: string,
    inputParametersByName: Record<string, InputParameter>,
    operation: LAOperation | undefined,
    manifest?: OperationManifest,
    customSwagger?: SwaggerParser,
    nodeParameters?: Record<string, ParameterInfo>,
    operationMetadata?: Record<string, any>
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
        !equals(type, constants.NODE.TYPE.IF) &&
        !equals(type, constants.NODE.TYPE.FOREACH) &&
        !equals(type, constants.NODE.TYPE.SWITCH) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION_NOTIFICATION) &&
        !equals(type, constants.NODE.TYPE.AGENT)
      ) {
        const binder = new ManifestInputsBinder(manifest, nodeParameters ?? {}, operationMetadata);
        return binder.bind(input, inputParametersByName, customSwagger);
      }

      if (
        equals(type, constants.NODE.TYPE.API_CONNECTION) ||
        equals(type, constants.NODE.TYPE.API_CONNECTION_WEBHOOK) ||
        equals(type, constants.NODE.TYPE.API_CONNECTION_NOTIFICATION)
      ) {
        const binder = new ApiConnectionInputsBinder(operation as LAOperation, nodeParameters ?? {}, operationMetadata);
        return binder.bind(input, inputParametersByName);
      }

      const binder = new DefaultInputsBinder(nodeParameters ?? {}, operationMetadata);
      return binder.bind(input);
    };

    return Promise.all(inputArray.map(getBoundParameters));
  }
}
