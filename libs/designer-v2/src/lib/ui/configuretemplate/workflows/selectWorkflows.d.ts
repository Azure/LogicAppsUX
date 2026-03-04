import type { WorkflowTemplateData } from '../../../core';
export declare const SelectWorkflows: ({ selectedWorkflowsList, onWorkflowsSelected, }: {
    selectedWorkflowsList: Record<string, Partial<WorkflowTemplateData>>;
    onWorkflowsSelected: (normalizedWorkflowIds: string[]) => void;
}) => import("react/jsx-runtime").JSX.Element;
