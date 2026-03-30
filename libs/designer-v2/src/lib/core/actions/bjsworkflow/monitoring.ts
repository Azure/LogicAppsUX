import {
  type InputParameter,
  equals,
  getRecordEntry,
  LoggerService,
  OperationManifestService,
  Status,
  type BoundParameters,
  type BoundParameter,
  map,
  type LogicAppsV2,
  RunService,
  type ContentLink,
  labelCase,
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
import { getAgentActionsRepetition, getAgentRepetition } from '../../queries/runs';

/**
 * Converts raw JSON data into BoundParameters format for display in ValuesPanel.
 * Each top-level key becomes a BoundParameter with proper displayName and value.
 */
const convertToBoundParameters = (data: Record<string, any>): BoundParameters => {
  const result: BoundParameters = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = {
      displayName: labelCase(key),
      value: value,
    } as BoundParameter;
  }
  return result;
};

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
  async (payload: InitInputsOutputsPayload, { getState }: any): Promise<InputsOutputsBinding> => {
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

/**
 * Fetches iteration-level data for built-in agent tools (e.g. code_interpreter).
 * Built-in tools have action-level content links available via getAgentActionsRepetition.
 * We fetch the actual content from those links to avoid CORS issues.
 */
export const fetchBuiltInToolRunData = createAsyncThunk(
  'fetchBuiltInToolRunData',
  async (payload: {
    toolNodeId: string;
    agentNodeId: string;
    runId: string;
    repetitionName: string;
    inputsLink?: ContentLink;
    outputsLink?: ContentLink;
  }) => {
    const { toolNodeId, agentNodeId, runId, repetitionName } = payload;

    // Use action-level links if provided, otherwise fetch them from getAgentActionsRepetition
    let actionInputsLink = payload.inputsLink;
    let actionOutputsLink = payload.outputsLink;
    let repetitionProperties: any = {};

    if (actionInputsLink || actionOutputsLink) {
      // We have action-level links — no need to fetch
      repetitionProperties = {};
    } else {
      // Fetch action results to get tool-specific links (not the parent agent's links)
      const actionsRepetitions = await getAgentActionsRepetition(agentNodeId, runId, repetitionName, 0);
      let foundToolAction = false;
      for (const actionsRepetition of actionsRepetitions) {
        const actionResults: any[] = (actionsRepetition.properties as any)?.actionResults ?? [];
        for (const action of actionResults) {
          if (action?.name === toolNodeId) {
            actionInputsLink = action.inputsLink as ContentLink | undefined;
            actionOutputsLink = action.outputsLink as ContentLink | undefined;
            repetitionProperties = action;
            foundToolAction = true;
            break;
          }
        }
        if (foundToolAction) {
          break;
        }
      }

      // Fall back to parent repetition if tool-specific action not found
      if (!foundToolAction) {
        const repetition = await getAgentRepetition(agentNodeId, runId, repetitionName);
        actionInputsLink = repetition.properties.inputsLink as ContentLink | undefined;
        actionOutputsLink = repetition.properties.outputsLink as ContentLink | undefined;
        repetitionProperties = repetition.properties;
      }
    }

    // Fetch the actual content from the links
    let inputs: Record<string, any> = {};
    let outputs: Record<string, any> = {};

    try {
      if (actionInputsLink?.uri) {
        inputs = (await RunService().getContent(actionInputsLink as ContentLink)) ?? {};
      }
    } catch (e) {
      // Content fetch failed - continue with empty inputs
      console.warn('[fetchBuiltInToolRunData] Failed to fetch built-in tool inputs:', e);
    }

    try {
      if (actionOutputsLink?.uri) {
        outputs = (await RunService().getContent(actionOutputsLink as ContentLink)) ?? {};
      }
    } catch (e) {
      // Content fetch failed - continue with empty outputs
      console.warn('[fetchBuiltInToolRunData] Failed to fetch built-in tool outputs:', e);
    }

    // Convert raw inputs/outputs to BoundParameters format for display
    const boundInputs = convertToBoundParameters(inputs);
    const boundOutputs = convertToBoundParameters(outputs);

    const result = {
      toolNodeId,
      inputsLink: actionInputsLink,
      outputsLink: actionOutputsLink,
      inputs: boundInputs,
      outputs: boundOutputs,
      startTime: repetitionProperties.startTime,
      endTime: repetitionProperties.endTime,
      status: repetitionProperties.status,
      correlation: repetitionProperties.correlation,
    };
    return result;
  }
);
