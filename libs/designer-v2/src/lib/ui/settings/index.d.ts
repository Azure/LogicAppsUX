/// <reference types="react" />
import type { PanelTabProps } from '@microsoft/designer-ui';
import type { Settings } from '../../core/actions/bjsworkflow/settings';
import type { ValidationError } from './validation/validation';
import type { IDropdownOption } from '@fluentui/react';
export type ToggleHandler = (checked: boolean) => void;
export type TextChangeHandler = (newVal: string) => void;
export type NumberChangeHandler = (newVal: number) => void;
export type DropdownSelectionChangeHandler = (selectedOption: IDropdownOption) => void;
export declare const SettingSectionName: {
    readonly DATAHANDLING: "datahandling";
    readonly GENERAL: "general";
    readonly NETWORKING: "networking";
    readonly RUNAFTER: "runafter";
    readonly SECURITY: "security";
    readonly TRACKING: "tracking";
};
export type SettingSectionName = (typeof SettingSectionName)[keyof typeof SettingSectionName];
export interface SectionProps extends Settings {
    readOnly: boolean | undefined;
    nodeId: string;
    expanded: boolean;
    onHeaderClick?: HeaderClickHandler;
    validationErrors?: ValidationError[];
}
export interface MaximumWaitingRunsMetadata {
    min: number;
    max: number;
}
export type HeaderClickHandler = (sectionName: SettingSectionName) => void;
export declare const SettingsPanel: React.FC<PanelTabProps>;
