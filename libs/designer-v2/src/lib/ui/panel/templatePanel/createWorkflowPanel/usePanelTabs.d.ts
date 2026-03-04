import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { CreateWorkflowHandler } from '../../../templates';
export declare const useCreateWorkflowPanelTabs: ({ isMultiWorkflowTemplate, createWorkflow, onClosePanel, showCloseButton, }: {
    createWorkflow: CreateWorkflowHandler;
    isMultiWorkflowTemplate: boolean;
    showCloseButton?: boolean | undefined;
    onClosePanel?: (() => void) | undefined;
}) => TemplateTabProps[];
