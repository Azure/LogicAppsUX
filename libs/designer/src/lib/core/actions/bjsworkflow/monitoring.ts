import {
  type InputParameter,
  equals,
  getRecordEntry,
  LoggerService,
  OperationManifestService,
  Status,
  type BoundParameters,
  map,
  type LogicAppsV2,
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../..';
import { getOperationManifest } from '../../queries/operation';
import InputsBinder from '../../utils/monitoring/binders/inputs';
import constants from '../../../common/constants';
import { parseOutputs, parseInputs } from '../../utils/monitoring';
import { getCustomSwaggerIfNeeded } from './initialize';
import { ParameterGroupKeys } from '../../utils/parameters/helper';
import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import { getConnectorWithSwagger } from '../../queries/connections';
import OutputsBinder from '../../utils/monitoring/binders/outputs';

interface InitInputsOutputsPayload {
  nodeId: string;
  inputsOutputs: InputsOutputsBinding;
}

interface InputsOutputsBinding {
  nodeId: string;
  inputs: BoundParameters;
  outputs: BoundParameters;
}

/**
 * Asynchronous thunk action to initialize inputs and outputs binding.
 * @param {InitInputsOutputsPayload} payload - The payload containing nodeId and inputsOutputs.
 * @param {Object} thunkAPI - The thunk API object containing getState method.
 * @returns {Promise<InputsOutputsBinding>} A promise that resolves to an InputsOutputsBinding object.
 */
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
      const { boundInputs, boundOutputs } = await getInputsOutputsBinding(state, nodeId, inputsOutputs);

      LoggerService().endTrace(traceId, { status: Status.Success });
      return { nodeId, inputs: boundInputs[0], outputs: boundOutputs[0] };
    } catch (_e) {
      LoggerService().endTrace(traceId, { status: Status.Failure });
      return { nodeId, inputs: parseInputs(inputsOutputs.inputs), outputs: parseOutputs(inputsOutputs.outputs) };
    }
  }
);

const getInputsOutputsBinding = async (
  rootState: RootState,
  nodeId: string,
  inputsOutputs: any
): Promise<{ boundInputs: BoundParameters[]; boundOutputs: BoundParameters[] }> => {
  const operationInfo: NodeOperation | undefined = getRecordEntry(rootState.operations.operationInfo, nodeId);
  const definition: LogicAppsV2.OperationDefinition | undefined = getRecordEntry(rootState.workflow.operations, nodeId);
  const { inputs, outputs } = inputsOutputs;

  if (!operationInfo || !definition) {
    return { boundInputs: [], boundOutputs: [] };
  }

  const type = operationInfo.type;
  const kind = operationInfo.kind;

  const manifest = OperationManifestService().isSupported(type, kind) ? await getOperationManifest(operationInfo) : undefined;
  const customSwagger = manifest ? await getCustomSwaggerIfNeeded(manifest.properties, definition) : undefined;
  const inputsToBind = getParametersToBind(operationInfo.type, inputs, true);
  const outputsToBind = getParametersToBind(operationInfo.type, outputs, false);

  const nodeInputs =
    getRecordEntry(rootState.operations.inputParameters, nodeId)?.parameterGroups?.[ParameterGroupKeys.DEFAULT]?.parameters ?? [];
  const nodeRawInputs =
    getRecordEntry(rootState.operations.inputParameters, nodeId)?.parameterGroups?.[ParameterGroupKeys.DEFAULT]?.rawInputs ?? [];

  const inputParameters: Record<string, InputParameter> = map(nodeRawInputs, 'key');
  const outputParameters = getRecordEntry(rootState.operations.outputParameters, nodeId)?.outputs ?? {};

  const operation = manifest
    ? undefined
    : await (await getConnectorWithSwagger(operationInfo.connectorId)).parsedSwagger.getOperationByOperationId(operationInfo.operationId);

  const inputsBinder = new InputsBinder();
  const boundInputs: BoundParameters[] = await inputsBinder.bind(
    inputsToBind,
    type,
    inputParameters,
    operation,
    manifest,
    customSwagger,
    map(nodeInputs, 'parameterKey'),
    definition.metadata
  );

  const outputsBinder = new OutputsBinder();
  const boundOutputs = await outputsBinder.bind(outputsToBind, type, outputParameters, manifest, undefined, definition.metadata);
  return { boundInputs, boundOutputs };
};

const getParametersToBind = (type: string, payloadInputs: any, isInputs: boolean): any => {
  if (equals(type, constants.NODE.TYPE.QUERY)) {
    if (payloadInputs) {
      return isInputs ? { from: payloadInputs } : { body: payloadInputs };
    }
    return null;
  }
  return payloadInputs;
};
