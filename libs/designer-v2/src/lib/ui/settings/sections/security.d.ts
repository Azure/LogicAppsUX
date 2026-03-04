/// <reference types="react" />
import type { SectionProps, ToggleHandler } from '..';
export interface SecuritySectionProps extends SectionProps {
    onSecureInputsChange: ToggleHandler;
    onSecureOutputsChange: ToggleHandler;
}
export declare const Security: ({ nodeId, expanded, readOnly, secureInputs, secureOutputs, onSecureInputsChange, onSecureOutputsChange, onHeaderClick, }: SecuritySectionProps) => JSX.Element | null;
