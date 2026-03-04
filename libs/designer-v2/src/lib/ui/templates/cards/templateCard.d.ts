import type { IDocumentCardStyles } from '@fluentui/react';
interface TemplateCardProps {
    templateName: string;
    isLightweight?: boolean;
    blankWorkflowProps?: {
        isWorkflowEmpty: boolean;
    };
    cssOverrides?: Record<string, string>;
    onSelect?: TemplateSelectHandler;
}
export type TemplateSelectHandler = (templateName: string, isSingleWorkflow: boolean) => void;
export declare const maxConnectorsToShow = 4;
export declare const templateCardStyles: IDocumentCardStyles;
export declare const TemplateCard: ({ templateName, isLightweight, blankWorkflowProps, cssOverrides, onSelect }: TemplateCardProps) => import("react/jsx-runtime").JSX.Element;
export {};
