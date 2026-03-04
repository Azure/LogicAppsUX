/// <reference types="react" />
import type { SectionProps, ToggleHandler, TextChangeHandler, NumberChangeHandler, MaximumWaitingRunsMetadata } from '..';
import { type DropdownSelectionChangeHandler, type ExpressionChangeHandler } from '@microsoft/designer-ui';
export interface GeneralSectionProps extends SectionProps {
    maximumWaitingRunsMetadata: MaximumWaitingRunsMetadata;
    onConcurrencyToggle: ToggleHandler;
    onConcurrencyRunValueChange: NumberChangeHandler;
    onConcurrencyMaxWaitRunChange: NumberChangeHandler;
    onInvokerConnectionToggle: ToggleHandler;
    onSplitOnToggle: ToggleHandler;
    onSplitOnSelectionChanged: DropdownSelectionChangeHandler;
    onTimeoutValueChange: TextChangeHandler;
    onTriggerConditionsChange: ExpressionChangeHandler;
    onClientTrackingIdChange: TextChangeHandler;
    onCountValueChange: NumberChangeHandler;
    onShouldFailOperationToggle: ToggleHandler;
}
export declare const General: ({ nodeId, readOnly, expanded, splitOn, splitOnConfiguration, timeout, count, concurrency, conditionExpressions, invokerConnection, maximumWaitingRunsMetadata, onConcurrencyToggle, onConcurrencyRunValueChange, onConcurrencyMaxWaitRunChange, onInvokerConnectionToggle, onSplitOnToggle, onSplitOnSelectionChanged, onTimeoutValueChange, onCountValueChange, onTriggerConditionsChange, onClientTrackingIdChange, onHeaderClick, validationErrors, shouldFailOperation, onShouldFailOperationToggle, }: GeneralSectionProps) => JSX.Element;
