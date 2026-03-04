/// <reference types="react" />
import type { TemplateSearchAndFilterProps } from '../filters/templatesearchfilters';
import type { TemplateSelectHandler } from '../cards/templateCard';
export interface TemplatesGalleryWithSearchProps {
    searchAndFilterProps: TemplateSearchAndFilterProps;
    isLightweight?: boolean;
    pageCount?: number;
    blankTemplateCard?: JSX.Element;
    cssOverrides?: Record<string, string>;
    onTemplateSelect: TemplateSelectHandler;
}
export declare const TemplatesGalleryWithSearch: ({ isLightweight, pageCount, blankTemplateCard, searchAndFilterProps, cssOverrides, onTemplateSelect, }: TemplatesGalleryWithSearchProps) => import("react/jsx-runtime").JSX.Element;
