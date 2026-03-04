import type { CreateWorkflowHandler } from './TemplatesDesigner';
export declare const TemplateOverview: ({ createWorkflow, panelWidth, onClose, showCloseButton, }: {
    createWorkflow: CreateWorkflowHandler;
    panelWidth?: string | undefined;
    showCloseButton?: boolean | undefined;
    onClose?: (() => void) | undefined;
}) => import("react/jsx-runtime").JSX.Element;
