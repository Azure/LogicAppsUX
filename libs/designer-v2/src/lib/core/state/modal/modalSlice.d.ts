export interface ModalState {
    isCombineVariableOpen: boolean;
    resolveCombineVariable?: (useCombined: boolean) => void;
    isTriggerDescriptionOpen: boolean;
    kindChangeDialogType?: string;
}
export declare const openCombineVariableModal: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    resolve: (useCombined: boolean) => void;
}, "modal/openCombineVariableModal">, closeCombineVariableModal: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "modal/closeCombineVariableModal">, openTriggerDescriptionModal: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"modal/openTriggerDescriptionModal">, closeTriggerDescriptionModal: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"modal/closeTriggerDescriptionModal">, openKindChangeDialog: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    type: string;
}, "modal/openKindChangeDialog">, closeKindChangeDialog: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"modal/closeKindChangeDialog">;
declare const _default: import("@reduxjs/toolkit").Reducer<ModalState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
