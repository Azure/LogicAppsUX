import type { WorkflowTemplateData } from '../../../../../core';
import { type Template } from '@microsoft/logic-apps-shared';
export interface EditWorkflowPanelProps {
    onTabClick?: () => void;
    hasError?: boolean;
    disabled?: boolean;
    isPrimaryButtonDisabled: boolean;
    isSaving: boolean;
    onSave?: (status: Template.TemplateEnvironment) => void;
    onClose?: () => void;
    status?: Template.TemplateEnvironment;
    selectedWorkflowsList: Record<string, Partial<WorkflowTemplateData>>;
}
export declare const EditWorkflowsPanel: ({ selectedWorkflowIds, onSave, }: {
    selectedWorkflowIds: string[];
    onSave?: ((isMultiWorkflow: boolean) => void) | undefined;
}) => import("react/jsx-runtime").JSX.Element;
