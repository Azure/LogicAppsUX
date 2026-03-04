import type { CreateWorkflowHandler } from '../../../templates';
export interface CreateWorkflowTabProps {
    isCreating: boolean;
    previousTabId?: string;
    nextTabId?: string;
    hasError: boolean;
    disabled?: boolean;
    shouldClearDetails: boolean;
    showCloseButton?: boolean;
    onClosePanel?: () => void;
}
export interface CreateWorkflowPanelProps {
    createWorkflow?: CreateWorkflowHandler;
    clearDetailsOnClose?: boolean;
    panelWidth?: string;
    showCloseButton?: boolean;
    onClose?: () => void;
}
export declare const CreateWorkflowPanel: ({ createWorkflow, onClose, panelWidth, clearDetailsOnClose, showCloseButton, }: CreateWorkflowPanelProps) => import("react/jsx-runtime").JSX.Element;
export declare const CreateWorkflowPanelHeader: ({ headerTitle, title, summary, onClose, }: {
    title: string;
    summary: string;
    headerTitle?: string | undefined;
    onClose?: (() => void) | undefined;
}) => import("react/jsx-runtime").JSX.Element;
