import { type BoundParameters } from '@microsoft/logic-apps-shared';
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
export declare const initializeInputsOutputsBinding: import("@reduxjs/toolkit").AsyncThunk<InputsOutputsBinding, InitInputsOutputsPayload, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export {};
