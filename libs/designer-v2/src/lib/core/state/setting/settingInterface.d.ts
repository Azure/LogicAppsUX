import type { ValidationError } from '../../../ui/settings/validation/validation';
export declare const SettingSectionName: {
    readonly DATAHANDLING: "datahandling";
    readonly GENERAL: "general";
    readonly NETWORKING: "networking";
    readonly RUNAFTER: "runafter";
    readonly SECURITY: "security";
    readonly TRACKING: "tracking";
};
export type SettingSectionName = (typeof SettingSectionName)[keyof typeof SettingSectionName];
export interface SettingsState {
    validationErrors: Record<string, ValidationError[]>;
    expandedSections: SettingSectionName[];
}
