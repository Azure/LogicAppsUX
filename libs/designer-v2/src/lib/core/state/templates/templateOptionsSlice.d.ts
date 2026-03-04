import type { Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
export interface TemplateOptionsState {
    servicesInitialized: boolean;
    enableResourceSelection?: boolean;
    reInitializeServices?: boolean;
    viewTemplateDetails?: Template.ViewTemplateDetails;
}
export declare const templateOptionsSlice: import("@reduxjs/toolkit").Slice<TemplateOptionsState, {
    setViewTemplateDetails: (state: import("immer/dist/internal").WritableDraft<TemplateOptionsState>, action: PayloadAction<Template.ViewTemplateDetails>) => void;
    setEnableResourceSelection: (state: import("immer/dist/internal").WritableDraft<TemplateOptionsState>, action: PayloadAction<boolean>) => void;
}, "templateOptions">;
export declare const setViewTemplateDetails: import("@reduxjs/toolkit").ActionCreatorWithPayload<Template.ViewTemplateDetails, "templateOptions/setViewTemplateDetails">, setEnableResourceSelection: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "templateOptions/setEnableResourceSelection">;
declare const _default: import("@reduxjs/toolkit").Reducer<TemplateOptionsState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
