import type { TemplateTabProps } from '@microsoft/designer-ui';
export declare const useConfigureWorkflowPanelTabs: ({ onSave, onClose, }: {
    onSave?: ((isMultiWorkflow: boolean) => void) | undefined;
    onClose?: (() => void) | undefined;
}) => TemplateTabProps[];
