import type { HeaderClickHandler } from '.';
import type { RunAfterProps } from './sections/runafterconfiguration';
import type { ValidationError } from './validation/validation';
import type { MultiSelectSettingProps, MultiAddExpressionEditorProps, ExpressionsEditorProps, ExpressionsProps, ExpressionProps, ReactiveToggleProps, CustomValueSliderProps, SettingTextFieldProps, SettingTokenTextFieldProps, SettingToggleProps, SettingDictionaryProps, SettingDropdownProps } from '@microsoft/designer-ui';
import type { FC } from 'react';
type SettingBase = {
    visible?: boolean;
    nodeTitle?: string;
};
export type Settings = SettingBase & ({
    settingType: 'MultiSelectSetting';
    settingProp: MultiSelectSettingProps;
} | {
    settingType: 'MultiAddExpressionEditor';
    settingProp: MultiAddExpressionEditorProps;
} | {
    settingType: 'ExpressionsEditor';
    settingProp: ExpressionsEditorProps;
} | {
    settingType: 'Expressions';
    settingProp: ExpressionsProps;
} | {
    settingType: 'Expression';
    settingProp: ExpressionProps;
} | {
    settingType: 'ReactiveToggle';
    settingProp: ReactiveToggleProps;
} | {
    settingType: 'CustomValueSlider';
    settingProp: CustomValueSliderProps;
} | {
    settingType: 'SettingTextField';
    settingProp: SettingTextFieldProps;
} | {
    settingType: 'SettingToggle';
    settingProp: SettingToggleProps;
} | {
    settingType: 'SettingDictionary';
    settingProp: SettingDictionaryProps;
} | {
    settingType: 'SettingTokenField';
    settingProp: SettingTokenTextFieldProps;
} | {
    settingType: 'RunAfter';
    settingProp: RunAfterProps;
} | {
    settingType: 'SettingDropdown';
    settingProp: SettingDropdownProps;
});
type WarningDismissHandler = (key?: string, message?: string) => void;
export interface SettingsSectionProps {
    nodeId?: string;
    id?: string;
    title?: string;
    sectionName?: string;
    showHeading?: boolean;
    showSeparator?: boolean;
    expanded?: boolean;
    settings: Settings[];
    isReadOnly?: boolean;
    onHeaderClick?: HeaderClickHandler;
    validationErrors?: ValidationError[];
    onDismiss?: WarningDismissHandler;
}
export declare const SettingsSection: FC<SettingsSectionProps>;
export {};
