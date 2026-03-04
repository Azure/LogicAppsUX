import type { PayloadAction } from '@reduxjs/toolkit';
export interface ResourceState {
    subscriptionId: string;
    resourceGroup: string;
    location: string;
    logicAppName: string;
}
export declare const resourceSlice: import("@reduxjs/toolkit").Slice<ResourceState, {
    setResourceData: (state: import("immer/dist/internal").WritableDraft<ResourceState>, action: PayloadAction<ResourceState>) => void;
}, "resource">;
export declare const setResourceData: import("@reduxjs/toolkit").ActionCreatorWithPayload<ResourceState, "resource/setResourceData">;
declare const _default: import("@reduxjs/toolkit").Reducer<ResourceState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
