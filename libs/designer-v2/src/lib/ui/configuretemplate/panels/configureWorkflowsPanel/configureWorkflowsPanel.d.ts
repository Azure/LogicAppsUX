import type { WorkflowTemplateData } from '../../../../core';
import type { Template } from '@microsoft/logic-apps-shared';
export interface ConfigureWorkflowsTabProps {
    onTabClick?: () => void;
    hasError?: boolean;
    disabled?: boolean;
    isPrimaryButtonDisabled: boolean;
    isSaving: boolean;
    onSave?: () => void;
    onClose?: () => void;
    status?: Template.TemplateEnvironment;
    selectedWorkflowsList: Record<string, Partial<WorkflowTemplateData>>;
}
export declare const ConfigureWorkflowsPanel: ({ onSave }: {
    onSave?: ((isMultiWorkflow: boolean) => void) | undefined;
}) => import("react/jsx-runtime").JSX.Element;
