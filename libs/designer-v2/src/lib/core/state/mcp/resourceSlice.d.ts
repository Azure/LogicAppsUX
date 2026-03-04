import type { PayloadAction } from '@reduxjs/toolkit';
export interface ResourceState {
    subscriptionId: string;
    resourceGroup: string;
    location: string;
    logicAppName?: string;
}
interface InitialResourceState {
    subscriptionId: string;
    resourceGroup: string;
    location: string;
}
export declare const resourceSlice: import("@reduxjs/toolkit").Slice<ResourceState, {
    setInitialData: (state: import("immer/dist/internal").WritableDraft<ResourceState>, action: PayloadAction<InitialResourceState>) => void;
    setLogicApp: (state: import("immer/dist/internal").WritableDraft<ResourceState>, action: PayloadAction<{
        resourceGroup: string;
        location: string;
        logicAppName: string;
    }>) => void;
}, "resource">;
export declare const setInitialData: import("@reduxjs/toolkit").ActionCreatorWithPayload<InitialResourceState, "resource/setInitialData">, setLogicApp: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    resourceGroup: string;
    location: string;
    logicAppName: string;
}, "resource/setLogicApp">;
declare const _default: import("@reduxjs/toolkit").Reducer<ResourceState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
