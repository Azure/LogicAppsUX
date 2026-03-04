import type { ValidationError } from '../../../ui/settings/validation/validation';
import { SettingSectionName, type SettingsState } from './settingInterface';
import type { PayloadAction } from '@reduxjs/toolkit';
export declare const initialState: SettingsState;
export declare const settingsSlice: import("@reduxjs/toolkit").Slice<SettingsState, {
    setValidationError: (state: SettingsState, action: PayloadAction<{
        nodeId: string;
        errors: ValidationError[];
    }>) => void;
    setExpandedSections: (state: SettingsState, action: PayloadAction<SettingSectionName>) => void;
}, "operationSettings">;
export declare const setValidationError: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    errors: ValidationError[];
}, "operationSettings/setValidationError">, setExpandedSections: import("@reduxjs/toolkit").ActionCreatorWithPayload<SettingSectionName, "operationSettings/setExpandedSections">;
declare const _default: import("@reduxjs/toolkit").Reducer<SettingsState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
