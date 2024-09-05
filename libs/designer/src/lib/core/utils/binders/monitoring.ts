import type { BoundParameters, Swagger } from '@microsoft/logic-apps-shared';
import { equals, getRecordEntry, LoggerService, OperationManifestService, Status } from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../../core';
import { getOperationManifest } from '../../queries/operation';
import InputsBinder from './inputs';
import constants from '../../../common/constants';
import { parseInputs, parseOutputs } from '../monitoring';

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
      const testInputs = await getInputs(state, nodeId, inputsOutputs.inputs);
      const outputs = parseOutputs(inputsOutputs.outputs);

      console.log('charlie final result', testInputs);

      LoggerService().endTrace(traceId, { status: Status.Success });
      return { nodeId, inputs: parseInputs(inputsOutputs.inputs), outputs };
    } catch (e) {
      LoggerService().endTrace(traceId, { status: Status.Failure });
      return { nodeId, inputs: parseInputs(inputsOutputs.inputs), outputs: parseOutputs(inputsOutputs.outputs) };
    }
  }
);

const getInputs = async (rootState: RootState, nodeId: string, inputs: any): Promise<Record<string, BoundParameters[]>> => {
  const operation = getRecordEntry(rootState.operations.operationInfo, nodeId);

  if (!operation) {
    return {};
  }

  const type = operation.type;
  const kind = operation.kind ?? '';

  const manifest = OperationManifestService().isSupported(type, kind) ? await getOperationManifest(operation) : undefined;

  // Derive the schema from the inputs record
  const inputsToBind = getInputsToBind(operation.type, inputs);
  // const { inputParameters, recurrenceParameters } = getSchemaForInputs(
  //     designerContext,
  //     deferredStaticSchema,
  //     dynamicInputSchema,
  //     repetition,
  //     name,
  //     isInsideIterator,
  //     manifest
  // );

  // Bind inputs from the inputs record to input parameters using the schema derived from the inputs record
  const inputsBinder = new InputsBinder();
  const boundInputs: BoundParameters[] = inputsBinder.bind(
    inputs,
    type,
    kind,
    inputsToBind,
    operation as unknown as Swagger.Operation,
    manifest,
    undefined /* recurrence */,
    undefined /* placeholderForDynamicInputs */
  );
  console.log('boundInputs', boundInputs);

  return {};

  // // Replace input parameters with possible dynamic values from lookup values loaded using the dynamic values API
  // const combinedInputs = replaceDynamicLookupValues(boundInputs, parametersWithDynamicValues);

  // // Replace input parameters with possible dynamic values from lookup values loaded from operation metadata
  // const { definition } = designerContext.WorkflowActionsStore.getActionByName(name) || designerContext.WorkflowTriggersStore.getTriggerByName(name) || { definition: {} };
  // const metadata = (definition && definition.metadata) || {};
  // const replacedInputs = replaceMetadataLookupValues(combinedInputs, metadata);

  // // Bind expression traces to input parameters
  // const replacedInputsWithTraces = bindTraceToInputs(replacedInputs, expressionTrace);

  // return {
  //     [name]: replacedInputsWithTraces,
  // };
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
// function getInputsToGetSchema(
//     type: string,
//     payloadInputs: any, // tslint:disable-line: no-any
// ): any {
//     // tslint:disable-line: no-any
//     const inputsToBind = getInputsToBind(type, payloadInputs);
//     if (!Array.isArray(inputsToBind)) {
//         return inputsToBind;
//     }

//     // NOTE(joechung): If there are no inputs, we cannot infer what the schema for inputs should be.
//     const firstInput = first(record => record && Object.prototype.hasOwnProperty.call(record,'inputs'), inputsToBind);
//     return firstInput && firstInput.inputs;
// }

// function bindTraceToInputs(inputs: BoundParameters[], trace: LogicAppsV2.TraceRecord): BoundParameters[] {
//     // Don't change anything if the expression trace record is not for If or Switch.
//     // TODO(joechung): Extend this to support any expression trace record, not just expressionResult trace records.
//     if (!isTraceExpressionRecord(trace)) {
//         return inputs;
//     }

//     // Don't change anything if the input parameters are not populated yet.
//     const inputParameters = inputs[0];
//     if (!inputParameters || !inputParameters.expressionResult) {
//         return inputs;
//     }

//     // Attach the expression trace to the "expressionResult" input parameter.
//     inputs[0] = {
//         ...inputParameters,
//         expressionResult: {
//             ...inputParameters.expressionResult,
//             trace: trace.expression,
//         },
//     };

//     return inputs;
// }

// function getSchemaForInputs(
//     deferredStaticSchema: DeferredStaticSchema,
//     dynamicInputSchema: Swagger.Schema,
//     name: string,
//     manifest: OperationManifest
// ): InputsSchema {
//     // Do nothing if there is no static schema to process.
//     if (!deferredStaticSchema) {
//         return {
//             inputParameters: null,
//             operation: null,
//         };
//     }

//     // Get an input record to use to derive the static schema.
//     const parametersExtractor = new ParametersExtractor(designerContext);
//     const { payloadInputs, type } = deferredStaticSchema;
//     const inputsToBind = getInputsToGetSchema(type, payloadInputs);

//     // Do nothing if we couldn't derive the static schema from the inputs record.
//     const schema = parametersExtractor.getSchemaForInputs(inputsToBind, name, type, manifest);
//     if (!schema) {
//         return {
//             inputParameters: null,
//             operation: null,
//         };
//     }

//     // Return the static schema if there is no dynamic schema to process.
//     const { inputParameters, operation, recurrenceParameters } = schema;
//     if (!dynamicInputSchema) {
//         return {
//             inputParameters,
//             operation,
//             recurrenceParameters,
//         };
//     }

//     // Combine the static and dynamic schema and return the combined schema.
//     const dynamicInputsGenerator = new DynamicInputsGenerator(designerContext);
//     return {
//         inputParameters: dynamicInputsGenerator.generate(
//             inputParameters,
//             name,
//             dynamicInputSchema,
//             /* byName */ !manifest,
//             manifest,
//             inputsToBind,
//             /* expandOneOf */ designerContext.Features.isEnabled(Features.ENABLE_ONEOF)),
//         operation,
//         recurrenceParameters,
//     };
// }
