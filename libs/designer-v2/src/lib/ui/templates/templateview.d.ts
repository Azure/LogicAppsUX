import type { CreateWorkflowHandler } from './TemplatesDesigner';
export interface TemplateViewProps {
    createWorkflow: CreateWorkflowHandler;
    showSummary?: boolean;
    showCloseButton?: boolean;
    panelWidth?: string;
    onClose?: () => void;
}
export declare const TemplatesView: (props: TemplateViewProps) => import("react/jsx-runtime").JSX.Element;
