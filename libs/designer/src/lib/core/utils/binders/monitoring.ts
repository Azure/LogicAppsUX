import {
  type InputParameter,
  equals,
  getRecordEntry,
  LoggerService,
  ManifestParser,
  OperationManifestService,
  RecurrenceType,
  Status,
  unmap,
  type BoundParameters,
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../../core';
import { getOperationManifest } from '../../queries/operation';
import InputsBinder from './inputs';
import constants from '../../../common/constants';
import { parseInputs, parseOutputs } from '../monitoring';
import { getRecurrenceParameters } from '../parameters/recurrence';
import { getConnectorWithSwagger } from '../../queries/connections';

interface InitInputsOutputsPayload {
  nodeId: string;
  inputsOutputs: any;
}

interface InputsOutputsBinding {
  nodeId: string;
  inputs: BoundParameters;
  outputs: BoundParameters;
}

export const initializeInputsOutputsBinding = createAsyncThunk(
  'initializeInputsOutputsBinding',
  async (payload: InitInputsOutputsPayload, { getState }): Promise<InputsOutputsBinding> => {
    const traceId = LoggerService().startTrace({
      name: 'Initialize inputs and outputs binding',
      action: 'initializeInputsOutputsBinding',
      source: 'binders/monitoring.ts',
    });
    const { nodeId, inputsOutputs } = payload;

    try {
      const state = getState() as RootState;
      const inputs = await getInputs(state, nodeId, inputsOutputs.inputs);
      const outputs = parseOutputs(inputsOutputs.outputs);

      LoggerService().endTrace(traceId, { status: Status.Success });
      return { nodeId, inputs: inputs[0], outputs };
    } catch (e) {
      LoggerService().endTrace(traceId, { status: Status.Failure });
      return { nodeId, inputs: parseInputs(inputsOutputs.inputs), outputs: parseOutputs(inputsOutputs.outputs) };
    }
  }
);

const getInputs = async (rootState: RootState, nodeId: string, inputs: any): Promise<BoundParameters[]> => {
  const operation = getRecordEntry(rootState.operations.operationInfo, nodeId);

  if (!operation) {
    return [];
  }

  const type = operation.type;
  const kind = operation.kind;

  const manifest = OperationManifestService().isSupported(type, kind) ? await getOperationManifest(operation) : undefined;
  const inputsToBind = getInputsToBind(operation.type, inputs);
  const recurrenceSetting = manifest?.properties?.recurrence ?? { type: RecurrenceType.Basic };
  const recurrenceParameters = getRecurrenceParameters(recurrenceSetting, operation);
  let inputParameters: Record<string, InputParameter> = {};

  if (manifest) {
    const manifestParser = new ManifestParser(manifest, OperationManifestService().isAliasingSupported(type, kind));
    inputParameters = manifestParser.getInputParameters(
      false /* includeParentObject */,
      0 /* expandArrayPropertiesDepth */,
      undefined,
      undefined
    );
  } else {
    const includeNotificationParameters = !equals(type, constants.NODE.TYPE.API_CONNECTION);
    const { parsedSwagger } = await getConnectorWithSwagger(operation.connectorId);
    inputParameters = parsedSwagger.getInputParameters(operation.operationId, {
      excludeInternalParameters: false,
      includeNotificationParameters,
    }).byId;
  }

  const primaryInputParametersInArray = unmap(inputParameters);
  const placeholderForDynamicInputs = primaryInputParametersInArray.find((parameter) => parameter.dynamicSchema) ?? undefined;

  // Bind inputs from the inputs record to input parameters using the schema derived from the inputs record
  const inputsBinder = new InputsBinder();
  const boundInputs: BoundParameters[] = inputsBinder.bind(
    inputsToBind,
    type,
    kind,
    inputParameters,
    operation as any,
    manifest,
    undefined /* recurrence */,
    placeholderForDynamicInputs,
    recurrenceParameters as unknown as any
  );

  return boundInputs;
};

export function getInputsToBind(type: string, payloadInputs: any): any {
  if (equals(type, constants.NODE.TYPE.QUERY)) {
    if (payloadInputs) {
      return {
        body: payloadInputs,
      };
    }
    return null;
  }
  return payloadInputs;
}
