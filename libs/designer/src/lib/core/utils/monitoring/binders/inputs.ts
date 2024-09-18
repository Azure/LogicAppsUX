import type {
  BoundParameters,
  InputParameter,
  LogicApps,
  OperationManifest,
  ParameterInfo,
  Swagger,
  SwaggerParser,
} from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import {
  ApiConnectionInputsBinder,
  DefaultInputsBinder,
  SendToBatchInputsBinder,
  ManifestInputsBinder,
} from './inputs/index';
import constants from '../../../../common/constants';

export default class InputsBinder {
  async bind(
    inputs: any,
    type: string,
    kind: string | undefined,
    inputParametersByName: Record<string, InputParameter>,
    operation: Swagger.Operation,
    manifest?: OperationManifest,
    customSwagger?: SwaggerParser,
    nodeParameters?: Record<string, ParameterInfo>,
    operationMetadata?: Record<string, any>,
    _recurrence?: LogicApps.Recurrence,
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
      if (equals(type, constants.NODE.TYPE.IF) || equals(type, constants.NODE.TYPE.FOREACH) || equals(type, constants.NODE.TYPE.SWITCH)) {
        const binder = new DefaultInputsBinder();
        return binder.bind(input);
      }

      if (
        manifest &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK) &&
        !equals(type, constants.NODE.TYPE.OPEN_API_CONNECTION_NOTIFICATION)
      ) {
        const binder = new ManifestInputsBinder(manifest, nodeParameters ?? {}, operationMetadata, type?.toLowerCase());
        return binder.bind(input, inputParametersByName, customSwagger);
      }

      if (equals(type, constants.NODE.TYPE.API_CONNECTION) || equals(type, constants.NODE.TYPE.API_CONNECTION_WEBHOOK)) {
        const binder = new ApiConnectionInputsBinder();
        return binder.bind(input, inputParametersByName, operation);
      }

      if (equals(type, constants.NODE.TYPE.SEND_TO_BATCH)) {
        const binder = new SendToBatchInputsBinder();
        return binder.bind(input);
      }

      const binder = new DefaultInputsBinder();
      return binder.bind(input);
    };

    return Promise.all(inputArray.map(getBoundParameters));
  }
}
