import type { PayloadAction } from '@reduxjs/toolkit';
export interface TabState {
    selectedTabId: string | undefined;
    runValidation: boolean;
    enableWizard: boolean;
    isWizardUpdating: boolean;
}
export declare const tabSlice: import("@reduxjs/toolkit").Slice<TabState, {
    selectWizardTab: (state: import("immer/dist/internal").WritableDraft<TabState>, action: PayloadAction<string>) => void;
    setRunValidation: (state: import("immer/dist/internal").WritableDraft<TabState>, action: PayloadAction<boolean>) => void;
}, "tab">;
export declare const selectWizardTab: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "tab/selectWizardTab">, setRunValidation: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "tab/setRunValidation">;
declare const _default: import("@reduxjs/toolkit").Reducer<TabState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
