/// <reference types="react" />
import { type SectionProps, type ToggleHandler } from '..';
export interface DataHandlingSectionProps extends SectionProps {
    onAutomaticDecompressionChange: ToggleHandler;
    onSchemaValidationChange: ToggleHandler;
}
export declare const DataHandling: ({ nodeId, readOnly, expanded, requestSchemaValidation, disableAutomaticDecompression, onSchemaValidationChange, onAutomaticDecompressionChange, onHeaderClick, }: DataHandlingSectionProps) => JSX.Element;
