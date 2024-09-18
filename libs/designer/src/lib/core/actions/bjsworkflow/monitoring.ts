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

      LoggerService().endTrace(traceId, { status: Status.Success });
      return { nodeId, inputs: inputs[0], outputs: parseOutputs(inputsOutputs.outputs) };
    } catch (e) {
      LoggerService().endTrace(traceId, { status: Status.Failure });
      return { nodeId, inputs: parseInputs(inputsOutputs.inputs), outputs: parseOutputs(inputsOutputs.outputs) };
    }
  }
);

const getInputs = async (rootState: RootState, nodeId: string, inputs: any): Promise<BoundParameters[]> => {
  const operationInfo: NodeOperation | undefined = getRecordEntry(rootState.operations.operationInfo, nodeId);
  const definition: LogicAppsV2.OperationDefinition | undefined = getRecordEntry(rootState.workflow.operations, nodeId);

  if (!operationInfo || !definition) {
    return [];
  }

  const type = operationInfo.type;
  const kind = operationInfo.kind;

  const manifest = OperationManifestService().isSupported(type, kind) ? await getOperationManifest(operationInfo) : undefined;
  const customSwagger = manifest ? await getCustomSwaggerIfNeeded(manifest.properties, definition) : undefined;
  const inputsToBind = getInputsToBind(operationInfo.type, inputs);
  const nodeInputs =
    getRecordEntry(rootState.operations.inputParameters, nodeId)?.parameterGroups?.[ParameterGroupKeys.DEFAULT]?.parameters ?? [];
  const nodeRawInputs =
    getRecordEntry(rootState.operations.inputParameters, nodeId)?.parameterGroups?.[ParameterGroupKeys.DEFAULT]?.rawInputs ?? [];
  const inputParameters: Record<string, InputParameter> = map(nodeRawInputs, 'key');
  const operation = manifest
    ? undefined
    : await (await getConnectorWithSwagger(operationInfo.connectorId)).parsedSwagger.getOperationByOperationId(operationInfo.operationId);

  // Bind inputs from the inputs record to input parameters using the schema derived from the inputs record
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

  return boundInputs;
};

const getInputsToBind = (type: string, payloadInputs: any): any => {
  if (equals(type, constants.NODE.TYPE.QUERY)) {
    if (payloadInputs) {
      return {
        from: payloadInputs,
      };
    }
    return null;
  }
  return payloadInputs;
};
