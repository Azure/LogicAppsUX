import type { DesignerOptionsState, ServiceOptions } from './designerOptionsInterfaces';
import type { PayloadAction } from '@reduxjs/toolkit';
export declare const initialDesignerOptionsState: DesignerOptionsState;
export declare const initializeServices: import("@reduxjs/toolkit").AsyncThunk<boolean, ServiceOptions, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const designerOptionsSlice: import("@reduxjs/toolkit").Slice<DesignerOptionsState, {
    initDesignerOptions: (state: DesignerOptionsState, action: PayloadAction<Omit<DesignerOptionsState, 'servicesInitialized'>>) => void;
}, "designerOptions">;
export declare const initDesignerOptions: import("@reduxjs/toolkit").ActionCreatorWithPayload<Omit<DesignerOptionsState, "servicesInitialized">, "designerOptions/initDesignerOptions">;
declare const _default: import("@reduxjs/toolkit").Reducer<DesignerOptionsState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
