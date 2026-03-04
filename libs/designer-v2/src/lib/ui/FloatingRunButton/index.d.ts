import type { Workflow } from '@microsoft/logic-apps-shared';
export type PayloadData = {
    method?: string;
    headers?: Record<string, string>;
    queries?: Record<string, string>;
    body?: string;
};
export interface FloatingRunButtonProps {
    siteResourceId?: string;
    workflowName?: string;
    saveDraftWorkflow: (workflowDefinition: Workflow, customCodeData: any, onSuccess: () => void, isDraftSave?: boolean) => Promise<any>;
    onRun?: (runId: string) => void;
    isDarkMode: boolean;
    isDraftMode?: boolean;
    isDisabled?: boolean;
    workflowReadOnly?: boolean;
    tooltipOverride?: string;
    chatProps?: {
        disabled?: boolean;
        tooltipText?: string;
    };
    isConsumption?: boolean;
}
export declare const FloatingRunButton: ({ siteResourceId, workflowName, saveDraftWorkflow, onRun, isDarkMode, isDraftMode, isDisabled, workflowReadOnly, tooltipOverride, chatProps, isConsumption, }: FloatingRunButtonProps) => import("react/jsx-runtime").JSX.Element;
