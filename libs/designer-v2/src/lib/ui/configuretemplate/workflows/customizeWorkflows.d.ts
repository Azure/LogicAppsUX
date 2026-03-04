import type { WorkflowTemplateData } from '../../../core';
export declare const CustomizeWorkflows: ({ selectedWorkflowsList, updateWorkflowDataField, duplicateIds, }: {
    selectedWorkflowsList: Record<string, Partial<WorkflowTemplateData>>;
    updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void;
    duplicateIds: string[];
}) => import("react/jsx-runtime").JSX.Element;
