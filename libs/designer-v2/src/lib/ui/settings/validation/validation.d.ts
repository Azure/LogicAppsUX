import { SettingSectionName } from '..';
import type { AppDispatch, RootState } from '../../../core';
import type { Settings } from '../../../core/actions/bjsworkflow/settings';
export declare const ValidationErrorKeys: {
    readonly CHUNK_SIZE_INVALID: "ChunkSizeInvalid";
    readonly PAGING_COUNT: "PagingCount";
    readonly RETRY_COUNT_INVALID: "RetryCountInvalid";
    readonly RETRY_INTERVAL_INVALID: "RetryIntervalInvalid";
    readonly SINGLE_INSTANCE_SPLITON: "SingleInstanceSplitOn";
    readonly TRIGGER_CONDITION_EMPTY: "TriggerConditionEmpty";
    readonly TIMEOUT_VALUE_INVALID: "TimeoutValueInvalid";
    readonly CANNOT_DELETE_LAST_ACTION: "CannotDeleteLastAction";
    readonly CANNOT_DELETE_LAST_STATUS: "CannotDeleteLastStatus";
    readonly CANNOT_RUN_AFTER_TRIGGER_AND_ACTION: "CannotRunAfterTriggerAndAction";
};
export type ValidationErrorKeys = (typeof ValidationErrorKeys)[keyof typeof ValidationErrorKeys];
export declare const ValidationErrorType: {
    readonly WARNING: "Warning";
    readonly ERROR: "Error";
    readonly INFO: "Info";
};
export type ValidationErrorType = (typeof ValidationErrorType)[keyof typeof ValidationErrorType];
export interface ValidationError {
    key: ValidationErrorKeys;
    errorType: ValidationErrorType;
    message: string;
}
export declare const validateNodeSettings: (selectedNode: string, settingsToValidate: Settings, settingSection: SettingSectionName, state: RootState, dispatch: AppDispatch) => void;
