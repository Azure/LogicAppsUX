export interface QuickViewPanelProps {
    showCreate: boolean;
    workflowId: string;
    clearDetailsOnClose?: boolean;
    panelWidth?: string;
    showCloseButton?: boolean;
    onClose?: () => void;
}
export declare const QuickViewPanel: ({ onClose, showCreate, workflowId, panelWidth, showCloseButton, clearDetailsOnClose, }: QuickViewPanelProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const QuickViewPanelHeader: ({ title, summary, sourceCodeUrl, isMultiWorkflowTemplate, details, features, onBackClick, onClose, }: {
    title: string;
    summary: string;
    sourceCodeUrl: string | undefined;
    details: Record<string, string>;
    isMultiWorkflowTemplate?: boolean | undefined;
    features?: string | undefined;
    onBackClick?: (() => void) | undefined;
    onClose?: (() => void) | undefined;
}) => import("react/jsx-runtime").JSX.Element;
