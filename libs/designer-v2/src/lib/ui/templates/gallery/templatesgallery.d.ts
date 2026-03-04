/// <reference types="react" />
interface TemplatesGalleryProps {
    isLightweight?: boolean;
    pageCount?: number;
    blankTemplateCard?: JSX.Element;
    cssOverrides?: Record<string, string>;
    onTemplateSelect?: (templateName: string, isSingleWorkflow: boolean) => void;
}
export declare const TemplatesGallery: ({ blankTemplateCard, pageCount, onTemplateSelect, isLightweight, cssOverrides, }: TemplatesGalleryProps) => import("react/jsx-runtime").JSX.Element;
export {};
