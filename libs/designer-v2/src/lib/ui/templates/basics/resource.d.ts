interface ResourceSectionProps {
    workflowId: string;
    showResourceFirst?: boolean;
    showTriggerDescription?: boolean;
    showTemplateInfo?: boolean;
    resourceOverrides?: {
        templateLabel?: string;
        workflowLabel?: string;
        triggerDescriptionLabel?: string;
        triggerDescriptionPlaceholder?: string;
        triggerDescriptionInfoLabel?: string;
    };
    cssOverrides?: Record<string, string>;
}
export declare const ResourceSection: (props: ResourceSectionProps) => import("react/jsx-runtime").JSX.Element;
export {};
