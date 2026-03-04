import type { AddCustomCodePayload, CustomCodeState, DeleteCustomCodePayload, RenameCustomCodePayload } from './customcodeInterfaces';
import type { PayloadAction } from '@reduxjs/toolkit';
export declare const initialState: CustomCodeState;
export declare const customCodeSlice: import("@reduxjs/toolkit").Slice<CustomCodeState, {
    initCustomCode: (state: import("immer/dist/internal").WritableDraft<CustomCodeState>, action: PayloadAction<Record<string, string> | undefined>) => void;
    addOrUpdateCustomCode: (state: import("immer/dist/internal").WritableDraft<CustomCodeState>, action: PayloadAction<AddCustomCodePayload>) => void;
    deleteCustomCode: (state: import("immer/dist/internal").WritableDraft<CustomCodeState>, action: PayloadAction<DeleteCustomCodePayload>) => void;
    renameCustomCodeFile: (state: import("immer/dist/internal").WritableDraft<CustomCodeState>, action: PayloadAction<RenameCustomCodePayload>) => void;
    resetCustomCode: (state: import("immer/dist/internal").WritableDraft<CustomCodeState>) => void;
}, "customCode">;
export declare const initCustomCode: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Record<string, string> | undefined, "customCode/initCustomCode">, addOrUpdateCustomCode: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddCustomCodePayload, "customCode/addOrUpdateCustomCode">, deleteCustomCode: import("@reduxjs/toolkit").ActionCreatorWithPayload<DeleteCustomCodePayload, "customCode/deleteCustomCode">, renameCustomCodeFile: import("@reduxjs/toolkit").ActionCreatorWithPayload<RenameCustomCodePayload, "customCode/renameCustomCodeFile">, resetCustomCode: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"customCode/resetCustomCode">;
declare const _default: import("@reduxjs/toolkit").Reducer<CustomCodeState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
